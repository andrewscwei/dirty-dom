/**
 * All supported event types of an `UpdateDelegate`.
 */
enum EventType {

  /**
   * Event triggered on every frame.
   */
  ENTER_FRAME = 'enterframe',

  /**
   * Event triggered when the window is resized.
   */
  RESIZE = 'resize',

  /**
   * Event triggered when the device orientation changes (only available for devices that support
   * the following events: `orientationchange`, `deviceorientation`, or `devicemotion`).
   */
  ORIENTATION_CHANGE = 'orientationchange',

  /**
   * Event triggered when an element is scrolled. Supports custom target element, defaults to the
   * window.
   */
  SCROLL = 'scroll',

  /**
   * Event triggered whenever an element detects a mouse wheel action. Supports custom target
   * element, defaults to the window.
   */
  MOUSE_WHEEL = 'wheel',

  /**
   * Event triggered whenever an element detects a mouse move action. Supports custom target
   * element, defaults to the window.
   */
  MOUSE_MOVE = 'mousemove',

  /**
   * Event triggered whenever a key up event is detected.
   */
  KEY_UP = 'keyup',

  /**
   * Event triggered whenever a key down event is detected.
   */
  KEY_DOWN = 'keydown',

  /**
   * Event triggered whenever a key press event is detected.
   */
  KEY_PRESS = 'keypress',
}

export default EventType
