// © Andrew Wei

import DirtyType from '../enums/DirtyType';
import EventType from '../enums/EventType';
import { DirtyInfo, ResponsiveDescriptor, typeIsDirtyType, typeIsEventType, UpdateDelegator } from '../types';
import cancelAnimationFrame from '../utils/cancelAnimationFrame';
import debounce from '../utils/debounce';
import requestAnimationFrame from '../utils/requestAnimationFrame';

/**
 * Delegate for managing update calls of an object.
 */
class UpdateDelegate {
  /**
   * Default refresh (debounce) rate in milliseconds.
   */
  protected static DEFAULT_REFRESH_RATE = 0.0;

  protected static DEFAULT_DIRTY_INFO: DirtyInfo = {
    [DirtyType.POSITION]: {},
    [DirtyType.SIZE]: {},
    [DirtyType.LAYOUT]: {},
    [DirtyType.STATE]: {},
    [DirtyType.DATA]: {},
    [DirtyType.LOCALE]: {},
    [DirtyType.CONFIG]: {},
    [DirtyType.STYLE]: {},
    [DirtyType.INPUT]: {
      mouseX: NaN,
      mouseY: NaN,
      mouseWheelX: NaN,
      mouseWheelY: NaN,
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
  };

  protected dirtyInfo: DirtyInfo = {};

  /**
   * Delegator of this instance.
   */
  private delegator: UpdateDelegator;

  /**
   * Event handlers.
   */
  private resizeHandler?: EventListener;
  private orientationChangeHandler?: EventListener;
  private scrollHandler?: EventListener;
  private mouseMoveHandler?: EventListener;
  private mouseWheelHandler?: EventListener;
  private keyUpHandler?: EventListener;
  private keyDownHandler?: EventListener;
  private keyPressHandler?: EventListener;
  private enterFrameHandler?: number;

  /**
   * Animation frame tracker.
   */
  private pendingAnimationFrame?: number;

  /**
   * Cache.
   */
  private conductorTable: { [key: string]: Window | HTMLElement } = {};
  private dirtyTable: number = 0;

  /**
   * Creates a new ElementUpdateDelegate instance.
   *
   * @param delegator - The object to create this update delegate for.
   * @param descriptors - Map of responsive descriptors.
   */
  constructor(delegator: UpdateDelegator, descriptors?: { [key in EventType]?: number | true | { conductor?: Window | HTMLElement, refreshRate?: number } }) {
    this.delegator = delegator;

    if (descriptors) {
      for (const key in descriptors) {
        if (!typeIsEventType(key)) continue;

        const value = descriptors[key];

        if (typeof value === 'number') {
          this.initResponsiveness({
            refreshRate: value,
            eventTypes: [key],
          });
        }
        else if (typeof value === 'object') {
          this.initResponsiveness({
            conductor: value.conductor,
            refreshRate: value.refreshRate,
            eventTypes: [key],
          });
        }
        else {
          this.initResponsiveness({
            eventTypes: [key],
          });
        }
      }
    }

    this.setDirty(DirtyType.ALL, true);
  }

  /**
   * Destroys all resources allocated by this UpdateDelegate instance.
   */
  destroy() {
    if (this.pendingAnimationFrame !== undefined) {
      cancelAnimationFrame(this.pendingAnimationFrame);
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('orientationchange', this.resizeHandler);
    }

    if (this.scrollHandler) {
      const conductor = this.conductorTable.scroll || window;
      conductor.removeEventListener('scroll', this.scrollHandler);
    }

    if (this.mouseWheelHandler) {
      const conductor = this.conductorTable.mouseWheel || window;
      conductor.removeEventListener('wheel', this.mouseWheelHandler);
    }

    if (this.mouseMoveHandler) {
      const conductor = this.conductorTable.mouseMove || window;
      conductor.removeEventListener('mousemove', this.mouseMoveHandler);
    }

    if (this.orientationChangeHandler) {
      const win = window as any;
      if (win.DeviceOrientationEvent) window.removeEventListener('deviceorientation', this.orientationChangeHandler);
      else if (win.DeviceMotionEvent) window.removeEventListener('devicemotion', this.orientationChangeHandler);
    }

    if (this.keyDownHandler) window.removeEventListener('keydown', this.keyDownHandler);
    if (this.keyPressHandler) window.removeEventListener('keypress', this.keyPressHandler);
    if (this.keyUpHandler) window.removeEventListener('keyup', this.keyUpHandler);
    if (this.enterFrameHandler !== undefined) window.clearInterval(this.enterFrameHandler);

    this.pendingAnimationFrame = undefined;
    this.resizeHandler = undefined;
    this.scrollHandler = undefined;
    this.mouseWheelHandler = undefined;
    this.mouseMoveHandler = undefined;
    this.orientationChangeHandler = undefined;
    this.keyDownHandler = undefined;
    this.keyPressHandler = undefined;
    this.keyUpHandler = undefined;
    this.enterFrameHandler = undefined;
    this.conductorTable = {};
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
      return (this.dirtyTable === dirtyType);
    default:
      return ((dirtyType & this.dirtyTable) !== 0);
    }
  }

  /**
   * Sets a dirty type as dirty, consequently invoking an update on the next
   * animation frame.
   *
   * @param dirtyType - The dirty type to set.
   * @param validateNow - Determines if the update should be validated right
   *                      away instead of on the next animation frame.
   */
  setDirty(dirtyType: DirtyType, validateNow: boolean = false) {
    if (this.isDirty(dirtyType) && !validateNow) return;

    switch (dirtyType) {
    case DirtyType.NONE:
      this.dirtyTable = DirtyType.NONE;
      this.dirtyInfo = {};
      return;
    case DirtyType.ALL:
      this.dirtyTable = DirtyType.ALL;
      this.dirtyInfo = {
        ...((this.constructor as any).DEFAULT_DIRTY_INFO),
        ...this.dirtyInfo,
      };
      break;
    default:
      this.dirtyTable |= dirtyType;
    }

    if (validateNow) {
      this.update();
    }
    else if (!this.pendingAnimationFrame) {
      this.pendingAnimationFrame = requestAnimationFrame(this.update.bind(this));
    }
    else if (this.pendingAnimationFrame) {
      window.setTimeout(() => this.setDirty(dirtyType, validateNow), 0.0);
    }
  }

  /**
   * Sets up the responsiveness to the provided conductor. Only the following
   * event types support a custom conductor, the rest use window as the
   * conductor:
   *   1. 'scroll'
   *   2. 'wheel'
   *   3. 'mousemove'
   *
   * @param params - @see ResponsiveDescriptor
   */
  protected initResponsiveness({ conductor = window, refreshRate = (this.constructor as any).DEFAULT_REFRESH_RATE, eventTypes = [] }: ResponsiveDescriptor = {}) {
    const isUniversal = eventTypes.length === 0;

    if (isUniversal || eventTypes.indexOf(EventType.RESIZE) > -1 || eventTypes.indexOf(EventType.ORIENTATION_CHANGE) > -1) {
      if (this.resizeHandler) {
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('orientationchange', this.resizeHandler);
      }

      this.resizeHandler = (refreshRate === 0.0) ? this.onWindowResize.bind(this) : debounce(this.onWindowResize.bind(this), refreshRate);

      window.addEventListener('resize', this.resizeHandler!);
      window.addEventListener('orientationchange', this.resizeHandler!);
    }

    if (isUniversal || eventTypes.indexOf(EventType.SCROLL) > -1) {
      if (this.scrollHandler) (this.conductorTable.scroll || window).removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = (refreshRate === 0.0) ? this.onScroll.bind(this) : debounce(this.onScroll.bind(this), refreshRate);
      this.conductorTable.scroll = conductor;
      conductor.addEventListener('scroll', this.scrollHandler);
    }

    if (isUniversal || eventTypes.indexOf(EventType.MOUSE_WHEEL) > -1) {
      if (this.mouseWheelHandler) (this.conductorTable.mouseWheel || window).removeEventListener('wheel', this.mouseWheelHandler);
      this.mouseWheelHandler = ((refreshRate === 0.0) ? this.onWindowMouseWheel.bind(this) : debounce(this.onWindowMouseWheel.bind(this), refreshRate)) as EventListener;
      this.conductorTable.mouseWheel = conductor;
      conductor.addEventListener('wheel', this.mouseWheelHandler);
    }

    if (isUniversal || eventTypes.indexOf(EventType.MOUSE_MOVE) > -1) {
      if (this.mouseMoveHandler) (this.conductorTable.mouseMove || window).removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = ((refreshRate === 0.0) ? this.onWindowMouseMove.bind(this) : debounce(this.onWindowMouseMove.bind(this), refreshRate)) as EventListener;
      this.conductorTable.mouseMove = conductor;
      conductor.addEventListener('mousemove', this.mouseMoveHandler);
    }

    if (isUniversal || eventTypes.indexOf(EventType.ORIENTATION_CHANGE) > -1) {
      const win = window as any;

      if (this.orientationChangeHandler) {
        if (win.DeviceOrientationEvent) window.removeEventListener('deviceorientation', this.orientationChangeHandler);
        else if (win.DeviceMotionEvent) window.removeEventListener('devicemotion', this.orientationChangeHandler);
      }

      this.orientationChangeHandler = (refreshRate === 0.0) ? this.onWindowOrientationChange.bind(this) : debounce(this.onWindowOrientationChange.bind(this), refreshRate);

      if (win.DeviceOrientationEvent) window.addEventListener('deviceorientation', this.orientationChangeHandler);
      else if (win.DeviceMotionEvent) window.addEventListener('devicemotion', this.orientationChangeHandler);
    }

    if (isUniversal || eventTypes.indexOf(EventType.KEY_DOWN) > -1) {
      if (this.keyDownHandler) window.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = this.onWindowKeyDown.bind(this) as EventListener;
      window.addEventListener('keydown', this.keyDownHandler);
    }

    if (isUniversal || eventTypes.indexOf(EventType.KEY_PRESS) > -1) {
      if (this.keyPressHandler) window.removeEventListener('keypress', this.keyPressHandler);
      this.keyPressHandler = this.onWindowKeyPress.bind(this) as EventListener;
      window.addEventListener('keypress', this.keyPressHandler);
    }

    if (isUniversal || eventTypes.indexOf(EventType.KEY_UP) > -1) {
      if (this.keyUpHandler) window.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = this.onWindowKeyUp.bind(this) as EventListener;
      window.addEventListener('keyup', this.keyUpHandler);
    }

    if (isUniversal || eventTypes.indexOf(EventType.ENTER_FRAME) > -1) {
      if (this.enterFrameHandler !== undefined) window.clearInterval(this.enterFrameHandler);
      this.enterFrameHandler = window.setInterval(this.onEnterFrame.bind(this), refreshRate);
    }
  }

  /**
   * Handler invoked whenever a visual update is required.
   */
  protected update() {
    if (this.pendingAnimationFrame !== undefined) {
      cancelAnimationFrame(this.pendingAnimationFrame);
    }

    if (this.delegator) {
      const nextInfo: DirtyInfo = {};

      for (const dirtyType in this.dirtyInfo) {
        if (!typeIsDirtyType(dirtyType)) continue;

        if (this.isDirty(dirtyType)) {
          nextInfo[dirtyType] = this.dirtyInfo[dirtyType];
        }
      }

      this.delegator.update.call(this.delegator, nextInfo);
    }

    // Reset the dirty info of all types.
    this.setDirty(DirtyType.NONE);

    this.pendingAnimationFrame = undefined;
  }

  /**
   * Handler invoked when the window resizes.
   *
   * @param event - The dispatched event.
   */
  protected onWindowResize(event: Event) {
    this.setDirty(DirtyType.SIZE);
  }

  /**
   * Handler invoked when the window scrolls.
   * @param event - The dispatched event.
   */
  protected onScroll(event: Event) {
    this.setDirty(DirtyType.POSITION);
  }

  /**
   * Handler invoked when the mouse is moved in the window.
   *
   * @param event - The dispatched event.
   */
  protected onWindowMouseMove(event: MouseEvent) {
    this.dirtyInfo[DirtyType.INPUT] = {
      ...this.dirtyInfo[DirtyType.INPUT] || {},
      mouseX: event.clientX,
      mouseY: event.clientY,
    };

    this.setDirty(DirtyType.INPUT);
  }

  /**
   * Handler invoked when the mouse wheel is spinning.
   *
   * @param event - The dispatched event.
   */
  protected onWindowMouseWheel(event: MouseWheelEvent) {
    this.dirtyInfo[DirtyType.INPUT] = {
      ...this.dirtyInfo[DirtyType.INPUT] || {},
      mouseWheelX: event.deltaX,
      mouseWheelY: event.deltaY,
    };

    this.setDirty(DirtyType.INPUT);
  }

  /**
   * Handler invoked when the window orientation changes.
   *
   * @param event = The dispatched event.
   */
  protected onWindowOrientationChange(event: Event) {
    const win = window as any;

    let x: number;
    let y: number;
    let z: number;

    if (event instanceof win.DeviceOrientationEvent) {
      x = (event as any).beta;
      y = (event as any).gamma;
      z = (event as any).alpha;
    }
    else if (event instanceof win.DeviceMotionEvent) {
      x = (event as any).acceleration.x * 2;
      y = (event as any).acceleration.y * 2;
      z = (event as any).acceleration.z * 2;
    }
    else {
      x = (event as any).orientation.x * 50;
      y = (event as any).orientation.y * 50;
      z = (event as any).orientation.z * 50;
    }

    this.dirtyInfo[DirtyType.ORIENTATION] = {
      ...this.dirtyInfo[DirtyType.ORIENTATION] || {},
      x,
      y,
      z,
    };

    this.setDirty(DirtyType.ORIENTATION);
  }

  /**
   * Handler invoked when there is a key up event.
   *
   * @param event - The dispatched event.
   */
  protected onWindowKeyUp(event: KeyboardEvent) {
    const prevInfo = this.dirtyInfo[DirtyType.INPUT] || {};

    this.dirtyInfo[DirtyType.INPUT] = {
      ...prevInfo,
      keyUp: [
        ...prevInfo.keyUp || [],
        event.keyCode,
      ],
    };

    this.setDirty(DirtyType.INPUT);
  }

  /**
   * Handler invoked when there is a key down event.
   *
   * @param event - The dispatched event.
   */
  protected onWindowKeyDown(event: KeyboardEvent) {
    const prevInfo = this.dirtyInfo[DirtyType.INPUT] || {};

    this.dirtyInfo[DirtyType.INPUT] = {
      ...prevInfo,
      keyDown: [
        ...prevInfo.keyDown || [],
        event.keyCode,
      ],
    };

    this.setDirty(DirtyType.INPUT);
  }

  /**
   * Handler invoked when there is a key press event.
   *
   * @param event - The dispatched event.
   */
  protected onWindowKeyPress(event: KeyboardEvent) {
    const prevInfo = this.dirtyInfo[DirtyType.INPUT] || {};

    this.dirtyInfo[DirtyType.INPUT] = {
      ...prevInfo,
      keyPress: [
        ...prevInfo.keyPress || [],
        event.keyCode,
      ],
    };

    this.setDirty(DirtyType.INPUT);
  }

  /**
   * Handler invoked on every frame.
   *
   * @param event - The dispatched event.
   */
  protected onEnterFrame(event: Event) {
    this.setDirty(DirtyType.FRAME);
  }
}

export default UpdateDelegate;
