import { Point, Rect, Size } from 'spase'
import DirtyType from '../enums/DirtyType'
import EventType from '../enums/EventType'
import { DirtyInfo, DirtyTarget, ResponsiveDescriptor, typeIsDirtyType, typeIsEventType, typeIsWindow } from '../types'
import cancelAnimationFrame from '../utils/cancelAnimationFrame'
import debounce from '../utils/debounce'
import requestAnimationFrame from '../utils/requestAnimationFrame'

/**
 * Delegate for managing update calls of an object.
 */
export default class UpdateDelegate {

  /**
   * Default refresh (debounce) rate in milliseconds.
   */
  protected static DEFAULT_REFRESH_RATE = 0.0

  protected static DEFAULT_DIRTY_INFO: DirtyInfo = {
    [DirtyType.POSITION]: {
      minPos: undefined,
      maxPos: undefined,
      pos: undefined,
      step: undefined,
    },
    [DirtyType.SIZE]: {
      minSize: undefined,
      maxSize: undefined,
    },
    [DirtyType.LAYOUT]: {},
    [DirtyType.STATE]: {},
    [DirtyType.DATA]: {},
    [DirtyType.LOCALE]: {},
    [DirtyType.CONFIG]: {},
    [DirtyType.STYLE]: {},
    [DirtyType.INPUT]: {
      mouse: undefined,
      mouseWheel: undefined,
      keyUp: [],
      keyDown: [],
      keyPress: [],
    },
    [DirtyType.ORIENTATION]: {
      x: NaN,
      y: NaN,
      z: NaN,
    },
    [DirtyType.FRAME]: {},
  }

  protected dirtyInfo: DirtyInfo = {}
  protected eventTargetDict: { [key in EventType]?: DirtyTarget } = {}
  protected eventHandlerDict: { [key in EventType]?: EventListener | number } = {}

  /**
   * Handler invoked whenever the `UpdateDelegate` emits an update event.
   *
   * @param info - An object describing what information was dirty since the last invocation of this
   *               handler.
   * @param delegate - The `UpdateDelegate` that invoked this handler.
   */
  protected updateHandler?: (info: DirtyInfo, delegate: UpdateDelegate) => void

  /**
   * Animation frame tracker.
   */
  private pendingAnimationFrame?: number

  /**
   * Cache.
   */
  private dirtyTable = 0
  private responsivenessTable?: { [key in EventType]?: number | true | { target?: DirtyTarget; refreshRate?: number } }
  private eventPropDict: { [key in EventType]?: any } = {}

  /**
   * Creates a new `UpdateDelegate` instance.
   *
   * @param updateHandler - The handler to invoke upon every update event.
   * @param descriptors - Map of responsive descriptors.
   */
  constructor(updateHandler: (info: DirtyInfo, delegate: UpdateDelegate) => void, descriptors?: { [key in EventType]?: number | true | { target?: DirtyTarget; refreshRate?: number } }) {
    this.updateHandler = updateHandler
    this.responsivenessTable = descriptors
  }

  /**
   * Gets the current viewport Rect of the window.
   *
   * @return Viewport Rect.
   */
  get viewport(): Rect {
    return Rect.fromViewport()
  }

  /**
   * Initiates the update delegation process.
   */
  init() {
    const descriptors = this.responsivenessTable

    if (descriptors) {
      for (const key in descriptors) {
        if (!typeIsEventType(key)) continue

        const value = descriptors[key]

        if (typeof value === 'number') {
          this.initResponsiveness({
            refreshRate: value,
            eventTypes: [key],
          })
        }
        else if (typeof value === 'object') {
          this.initResponsiveness({
            target: value.target,
            refreshRate: value.refreshRate,
            eventTypes: [key],
          })
        }
        else {
          this.initResponsiveness({
            eventTypes: [key],
          })
        }
      }
    }

    this.setDirty(DirtyType.ALL, true)
  }

  /**
   * Destroys all resources allocated by this `UpdateDelegate` instance.
   */
  deinit() {
    if (this.pendingAnimationFrame !== undefined) {
      cancelAnimationFrame(this.pendingAnimationFrame)
    }

    if (this.eventHandlerDict[EventType.RESIZE]) {
      window.removeEventListener('resize', this.eventHandlerDict[EventType.RESIZE] as EventListener)
      window.removeEventListener('orientationchange', this.eventHandlerDict[EventType.RESIZE] as EventListener)
    }

    if (this.eventHandlerDict[EventType.SCROLL]) {
      const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL]) ?? window
      target.removeEventListener('scroll', this.eventHandlerDict[EventType.SCROLL] as EventListener)
    }

    if (this.eventHandlerDict[EventType.MOUSE_WHEEL]) {
      const target = this.getDirtyTarget(this.eventTargetDict[EventType.MOUSE_WHEEL]) ?? window
      target.removeEventListener('wheel', this.eventHandlerDict[EventType.MOUSE_WHEEL] as EventListener)
    }

    if (this.eventHandlerDict[EventType.MOUSE_MOVE]) {
      const target = this.getDirtyTarget(this.eventTargetDict[EventType.MOUSE_MOVE]) ?? window
      target.removeEventListener('mousemove', this.eventHandlerDict[EventType.MOUSE_MOVE] as EventListener)
    }

    if (this.eventHandlerDict[EventType.ORIENTATION_CHANGE]) {
      const win = window as any
      if (win.DeviceOrientationEvent) window.removeEventListener('deviceorientation', this.eventHandlerDict[EventType.ORIENTATION_CHANGE] as EventListener)
      else if (win.DeviceMotionEvent) window.removeEventListener('devicemotion', this.eventHandlerDict[EventType.ORIENTATION_CHANGE] as EventListener)
    }

    if (this.eventHandlerDict[EventType.KEY_DOWN]) window.removeEventListener('keydown', this.eventHandlerDict[EventType.KEY_DOWN] as EventListener)
    if (this.eventHandlerDict[EventType.KEY_PRESS]) window.removeEventListener('keypress', this.eventHandlerDict[EventType.KEY_PRESS] as EventListener)
    if (this.eventHandlerDict[EventType.KEY_UP]) window.removeEventListener('keyup', this.eventHandlerDict[EventType.KEY_UP] as EventListener)
    if (this.eventHandlerDict[EventType.ENTER_FRAME] !== undefined) window.clearInterval(this.eventHandlerDict[EventType.ENTER_FRAME] as number)

    this.pendingAnimationFrame = undefined
    this.eventTargetDict = {}
    this.eventHandlerDict = {}
    this.eventPropDict = {}
  }

  /**
   * Checks dirty status of a given dirty type.
   *
   * @param dirtyType - Dirty type.
   *
   * @return `true` if dirty, `false` otherwise.
   */
  isDirty(dirtyType: DirtyType): boolean {
    switch (dirtyType) {
    case DirtyType.NONE:
    case DirtyType.ALL:
      return (this.dirtyTable === dirtyType)
    default:
      return ((dirtyType & this.dirtyTable) !== 0)
    }
  }

  /**
   * Sets a dirty type as dirty, consequently invoking an update on the next animation frame.
   *
   * @param dirtyType - The dirty type to set.
   * @param validateNow - Determines if the update should be validated right away instead of on the
   *                      next animation frame.
   */
  setDirty(dirtyType: DirtyType, validateNow = false) {
    if (this.isDirty(dirtyType) && !validateNow) return

    switch (dirtyType) {
    case DirtyType.NONE:
      this.dirtyTable = DirtyType.NONE
      this.dirtyInfo = {}
      return
    case DirtyType.ALL:
      this.dirtyTable = DirtyType.ALL
      this.dirtyInfo = {
        ...((this.constructor as any).DEFAULT_DIRTY_INFO),
        ...this.dirtyInfo,
      }

      this.updateSizeInfo()
      this.updatePositionInfo(this.eventTargetDict[EventType.SCROLL])

      break
    default:
      if (!this.dirtyInfo[dirtyType]) {
        this.dirtyInfo[dirtyType] = ((this.constructor as any).DEFAULT_DIRTY_INFO)[dirtyType]
      }

      this.dirtyTable |= dirtyType
    }

    if (validateNow) {
      this.update()
    }
    else if (!this.pendingAnimationFrame) {
      this.pendingAnimationFrame = requestAnimationFrame(this.update.bind(this))
    }
    else if (this.pendingAnimationFrame) {
      window.setTimeout(() => this.setDirty(dirtyType, validateNow), 0.0)
    }
  }

  /**
   * Gets the dirty target element based on its descriptor.
   *
   * @param descriptor - The descriptor.
   *
   * @returns The dirty target if it exists.
   */
  protected getDirtyTarget(descriptor: DirtyTarget): Window | HTMLElement | undefined | null {
    return (typeof descriptor === 'function') ? descriptor() : descriptor
  }

  /**
   * Updates the dirty info for position.
   *
   * @param reference - The reference element.
   */
  protected updatePositionInfo(reference?: DirtyTarget) {
    const refEl = this.getDirtyTarget(reference) || window
    const refRect = (typeIsWindow(refEl) ? Rect.fromViewport() : (Rect.from(refEl) || new Rect()).clone({ x: refEl.scrollLeft, y: refEl.scrollTop }))
    const refRectMin = refRect.clone({ x: 0, y: 0 })
    const refRectFull = Rect.from(refEl, { overflow: true })

    if (!refRectFull) return

    const refRectMax = refRectMin.clone({ x: refRectFull.width - refRect.width, y: refRectFull.height - refRect.height })
    const step = new Point([refRect.left / refRectMax.left, refRect.top / refRectMax.top])

    this.dirtyInfo[DirtyType.POSITION] = {
      ...this.dirtyInfo[DirtyType.POSITION] || {},
      minPos: new Point([refRectMin.left, refRectMin.top]),
      maxPos: new Point([refRectMax.left, refRectMax.top]),
      pos: new Point([refRect.left, refRect.top]),
      step,
    }
  }

  /**
   * Updates the dirty info for size.
   */
  protected updateSizeInfo() {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.RESIZE])

    if (!target) return

    let rectMin
    let rectMax

    if (target === window) {
      rectMin = Rect.fromViewport()
      rectMax = Rect.from(window, { overflow: true })
    }
    else {
      rectMin = Rect.from(target)
      rectMax = Rect.from(target, { overflow: true })

      this.eventPropDict[EventType.RESIZE] = rectMin
    }

    if (!rectMin) return
    if (!rectMax) return

    this.dirtyInfo[DirtyType.SIZE] = {
      ...this.dirtyInfo[DirtyType.SIZE] || {},
      minSize: rectMin.size,
      maxSize: rectMax.size,
    }
  }

  /**
   * Sets up the responsiveness to the provided target. Only the following event types support a
   * custom target, the rest use window as the target:
   *   1. 'scroll'
   *   2. 'wheel'
   *   3. 'mousemove'
   *
   * @param params - @see ResponsiveDescriptor
   */
  private initResponsiveness({ target = window, refreshRate = (this.constructor as any).DEFAULT_REFRESH_RATE, eventTypes = [] }: ResponsiveDescriptor = {}) {
    const isResponsiveToEverything = eventTypes.length === 0

    if (isResponsiveToEverything || eventTypes.indexOf(EventType.RESIZE) > -1 || eventTypes.indexOf(EventType.ORIENTATION_CHANGE) > -1) {
      if (this.eventHandlerDict[EventType.RESIZE]) {
        const t = this.getDirtyTarget(this.eventTargetDict[EventType.RESIZE])

        if (!t || (t === window)) {
          window.removeEventListener('resize', this.eventHandlerDict[EventType.RESIZE] as EventListener)
          window.removeEventListener('orientationchange', this.eventHandlerDict[EventType.RESIZE] as EventListener)
        }
        else {
          window.clearInterval(this.eventHandlerDict[EventType.RESIZE] as number)
        }
      }

      this.eventTargetDict[EventType.RESIZE] = target

      if (target === window) {
        this.eventHandlerDict[EventType.RESIZE] = (refreshRate === 0.0) ? this.onWindowResize.bind(this) : debounce(this.onWindowResize.bind(this), refreshRate)
        window.addEventListener('resize', this.eventHandlerDict[EventType.RESIZE] as EventListener)
        window.addEventListener('orientationchange', this.eventHandlerDict[EventType.RESIZE] as EventListener)
      }
      else {
        window.setInterval(this.onResize.bind(this), Math.max(refreshRate, 1 / 60))
      }
    }

    if (isResponsiveToEverything || eventTypes.indexOf(EventType.SCROLL) > -1) {
      if (this.eventHandlerDict[EventType.SCROLL]) (this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL]) || window).removeEventListener('scroll', this.eventHandlerDict[EventType.SCROLL] as EventListener)
      this.eventHandlerDict[EventType.SCROLL] = (refreshRate === 0.0) ? this.onScroll.bind(this) : debounce(this.onScroll.bind(this), refreshRate)
      this.eventTargetDict[EventType.SCROLL] = target
      this.getDirtyTarget(target)?.addEventListener('scroll', this.eventHandlerDict[EventType.SCROLL] as EventListener)
    }

    if (isResponsiveToEverything || eventTypes.indexOf(EventType.MOUSE_WHEEL) > -1) {
      if (this.eventHandlerDict[EventType.MOUSE_WHEEL]) (this.getDirtyTarget(this.eventTargetDict[EventType.MOUSE_WHEEL]) || window).removeEventListener('wheel', this.eventHandlerDict[EventType.MOUSE_WHEEL] as EventListener)
      this.eventHandlerDict[EventType.MOUSE_WHEEL] = ((refreshRate === 0.0) ? this.onWindowMouseWheel.bind(this) : debounce(this.onWindowMouseWheel.bind(this), refreshRate)) as EventListener
      this.eventTargetDict[EventType.MOUSE_WHEEL] = target
      this.getDirtyTarget(target)?.addEventListener('wheel', this.eventHandlerDict[EventType.MOUSE_WHEEL] as EventListener)
    }

    if (isResponsiveToEverything || eventTypes.indexOf(EventType.MOUSE_MOVE) > -1) {
      if (this.eventHandlerDict[EventType.MOUSE_MOVE]) (this.getDirtyTarget(this.eventTargetDict[EventType.MOUSE_MOVE]) || window).removeEventListener('mousemove', this.eventHandlerDict[EventType.MOUSE_MOVE] as EventListener)
      this.eventHandlerDict[EventType.MOUSE_MOVE] = ((refreshRate === 0.0) ? this.onWindowMouseMove.bind(this) : debounce(this.onWindowMouseMove.bind(this), refreshRate)) as EventListener
      this.eventTargetDict[EventType.MOUSE_MOVE] = target
      this.getDirtyTarget(target)?.addEventListener('mousemove', this.eventHandlerDict[EventType.MOUSE_MOVE] as EventListener)
    }

    if (isResponsiveToEverything || eventTypes.indexOf(EventType.ORIENTATION_CHANGE) > -1) {
      const win = window as any

      if (this.eventHandlerDict[EventType.ORIENTATION_CHANGE]) {
        if (win.DeviceOrientationEvent) window.removeEventListener('deviceorientation', this.eventHandlerDict[EventType.ORIENTATION_CHANGE] as EventListener)
        else if (win.DeviceMotionEvent) window.removeEventListener('devicemotion', this.eventHandlerDict[EventType.ORIENTATION_CHANGE] as EventListener)
      }

      this.eventHandlerDict[EventType.ORIENTATION_CHANGE] = (refreshRate === 0.0) ? this.onWindowOrientationChange.bind(this) : debounce(this.onWindowOrientationChange.bind(this), refreshRate)

      if (win.DeviceOrientationEvent) window.addEventListener('deviceorientation', this.eventHandlerDict[EventType.ORIENTATION_CHANGE] as EventListener)
      else if (win.DeviceMotionEvent) window.addEventListener('devicemotion', this.eventHandlerDict[EventType.ORIENTATION_CHANGE] as EventListener)
    }

    if (isResponsiveToEverything || eventTypes.indexOf(EventType.KEY_DOWN) > -1) {
      if (this.eventHandlerDict[EventType.KEY_DOWN]) window.removeEventListener('keydown', this.eventHandlerDict[EventType.KEY_DOWN] as EventListener)
      this.eventHandlerDict[EventType.KEY_DOWN] = this.onWindowKeyDown.bind(this) as EventListener
      window.addEventListener('keydown', this.eventHandlerDict[EventType.KEY_DOWN] as EventListener)
    }

    if (isResponsiveToEverything || eventTypes.indexOf(EventType.KEY_PRESS) > -1) {
      if (this.eventHandlerDict[EventType.KEY_PRESS]) window.removeEventListener('keypress', this.eventHandlerDict[EventType.KEY_PRESS] as EventListener)
      this.eventHandlerDict[EventType.KEY_PRESS] = this.onWindowKeyPress.bind(this) as EventListener
      window.addEventListener('keypress', this.eventHandlerDict[EventType.KEY_PRESS] as EventListener)
    }

    if (isResponsiveToEverything || eventTypes.indexOf(EventType.KEY_UP) > -1) {
      if (this.eventHandlerDict[EventType.KEY_UP]) window.removeEventListener('keyup', this.eventHandlerDict[EventType.KEY_UP] as EventListener)
      this.eventHandlerDict[EventType.KEY_UP] = this.onWindowKeyUp.bind(this) as EventListener
      window.addEventListener('keyup', this.eventHandlerDict[EventType.KEY_UP] as EventListener)
    }

    if (isResponsiveToEverything || eventTypes.indexOf(EventType.ENTER_FRAME) > -1) {
      if (this.eventHandlerDict[EventType.ENTER_FRAME] !== undefined) window.clearInterval(this.eventHandlerDict[EventType.ENTER_FRAME] as number)
      this.eventHandlerDict[EventType.ENTER_FRAME] = window.setInterval(this.onEnterFrame.bind(this), Math.max(refreshRate, 1 / 60))
    }
  }

  /**
   * Handler invoked whenever a visual update is required.
   */
  private update() {
    if (this.pendingAnimationFrame !== undefined) {
      cancelAnimationFrame(this.pendingAnimationFrame)
    }

    if (this.updateHandler) {
      const nextInfo: DirtyInfo = {}

      for (const dirtyType in this.dirtyInfo) {
        if (!typeIsDirtyType(dirtyType)) continue

        if (this.isDirty(dirtyType)) {
          nextInfo[dirtyType] = this.dirtyInfo[dirtyType]
        }
      }

      this.updateHandler(nextInfo, this)
    }

    // Reset the dirty info of all types.
    this.setDirty(DirtyType.NONE)

    this.pendingAnimationFrame = undefined
  }

  /**
   * Handler invoked when the window resizes.
   *
   * @param event - The dispatched event.
   */
  private onWindowResize(event: Event) {
    this.updateSizeInfo()
    this.updatePositionInfo(this.eventTargetDict[EventType.SCROLL])
    this.setDirty(DirtyType.SIZE | DirtyType.POSITION)
  }

  /**
   * Handler invoked when the target resize check interval is triggered.
   */
  private onResize() {
    const rect = Rect.from(this.getDirtyTarget(this.eventTargetDict[EventType.RESIZE]))
    const size = rect ? rect.size : new Size()

    if (this.eventPropDict[EventType.RESIZE] && size.equals(this.eventPropDict[EventType.RESIZE])) return

    this.updateSizeInfo()
    this.updatePositionInfo(this.eventTargetDict[EventType.SCROLL])
    this.setDirty(DirtyType.SIZE | DirtyType.POSITION)
  }

  /**
   * Handler invoked when the window scrolls.
   *
   * @param event - The dispatched event.
   */
  private onScroll(event: Event) {
    this.updatePositionInfo(event.currentTarget as HTMLElement | Window)
    this.setDirty(DirtyType.POSITION)
  }

  /**
   * Handler invoked when the mouse is moved in the window.
   *
   * @param event - The dispatched event.
   */
  private onWindowMouseMove(event: MouseEvent) {
    this.dirtyInfo[DirtyType.INPUT] = {
      ...this.dirtyInfo[DirtyType.INPUT] || {},
      mouse: new Point([event.clientX, event.clientY]),
    }

    this.setDirty(DirtyType.INPUT)
  }

  /**
   * Handler invoked when the mouse wheel is spinning.
   *
   * @param event - The dispatched event.
   */
  private onWindowMouseWheel(event: WheelEvent) {
    this.dirtyInfo[DirtyType.INPUT] = {
      ...this.dirtyInfo[DirtyType.INPUT] || {},
      mouseWheel: new Point([event.deltaX, event.deltaY]),
    }

    this.setDirty(DirtyType.INPUT)
  }

  /**
   * Handler invoked when the window orientation changes.
   *
   * @param event = The dispatched event.
   */
  private onWindowOrientationChange(event: Event) {
    const win = window as any

    let x: number
    let y: number
    let z: number

    if (event instanceof win.DeviceOrientationEvent) {
      x = (event as any).beta
      y = (event as any).gamma
      z = (event as any).alpha
    }
    else if (event instanceof win.DeviceMotionEvent) {
      x = (event as any).acceleration.x * 2
      y = (event as any).acceleration.y * 2
      z = (event as any).acceleration.z * 2
    }
    else {
      x = (event as any).orientation.x * 50
      y = (event as any).orientation.y * 50
      z = (event as any).orientation.z * 50
    }

    this.dirtyInfo[DirtyType.ORIENTATION] = {
      ...this.dirtyInfo[DirtyType.ORIENTATION] || {},
      x,
      y,
      z,
    }

    this.setDirty(DirtyType.ORIENTATION)
  }

  /**
   * Handler invoked when there is a key up event.
   *
   * @param event - The dispatched event.
   */
  private onWindowKeyUp(event: KeyboardEvent) {
    const prevInfo = this.dirtyInfo[DirtyType.INPUT] || {}

    this.dirtyInfo[DirtyType.INPUT] = {
      ...prevInfo,
      keyUp: [
        ...prevInfo.keyUp || [],
        event.keyCode,
      ],
    }

    this.setDirty(DirtyType.INPUT)
  }

  /**
   * Handler invoked when there is a key down event.
   *
   * @param event - The dispatched event.
   */
  private onWindowKeyDown(event: KeyboardEvent) {
    const prevInfo = this.dirtyInfo[DirtyType.INPUT] || {}

    this.dirtyInfo[DirtyType.INPUT] = {
      ...prevInfo,
      keyDown: [
        ...prevInfo.keyDown || [],
        event.keyCode,
      ],
    }

    this.setDirty(DirtyType.INPUT)
  }

  /**
   * Handler invoked when there is a key press event.
   *
   * @param event - The dispatched event.
   */
  private onWindowKeyPress(event: KeyboardEvent) {
    const prevInfo = this.dirtyInfo[DirtyType.INPUT] || {}

    this.dirtyInfo[DirtyType.INPUT] = {
      ...prevInfo,
      keyPress: [
        ...prevInfo.keyPress || [],
        event.keyCode,
      ],
    }

    this.setDirty(DirtyType.INPUT)
  }

  /**
   * Handler invoked when the enter frame check interval is triggered.
   */
  private onEnterFrame() {
    this.setDirty(DirtyType.FRAME)
  }
}
