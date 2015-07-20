/* */ 
(function(process) {
  'use strict';
  var EventListener = require("./EventListener");
  var ExecutionEnvironment = require("./ExecutionEnvironment");
  var PooledClass = require("./PooledClass");
  var ReactInstanceHandles = require("./ReactInstanceHandles");
  var ReactMount = require("./ReactMount");
  var ReactUpdates = require("./ReactUpdates");
  var assign = require("./Object.assign");
  var getEventTarget = require("./getEventTarget");
  var getUnboundedScrollPosition = require("./getUnboundedScrollPosition");
  var DOCUMENT_FRAGMENT_NODE_TYPE = 11;
  function findParent(node) {
    var nodeID = ReactMount.getID(node);
    var rootID = ReactInstanceHandles.getReactRootIDFromNodeID(nodeID);
    var container = ReactMount.findReactContainerForID(rootID);
    var parent = ReactMount.getFirstReactDOM(container);
    return parent;
  }
  function TopLevelCallbackBookKeeping(topLevelType, nativeEvent) {
    this.topLevelType = topLevelType;
    this.nativeEvent = nativeEvent;
    this.ancestors = [];
  }
  assign(TopLevelCallbackBookKeeping.prototype, {destructor: function() {
      this.topLevelType = null;
      this.nativeEvent = null;
      this.ancestors.length = 0;
    }});
  PooledClass.addPoolingTo(TopLevelCallbackBookKeeping, PooledClass.twoArgumentPooler);
  function handleTopLevelImpl(bookKeeping) {
    if (bookKeeping.nativeEvent.path) {
      handleTopLevelWithPath(bookKeeping);
    } else {
      handleTopLevelWithoutPath(bookKeeping);
    }
  }
  function handleTopLevelWithoutPath(bookKeeping) {
    var topLevelTarget = ReactMount.getFirstReactDOM(getEventTarget(bookKeeping.nativeEvent)) || window;
    var ancestor = topLevelTarget;
    while (ancestor) {
      bookKeeping.ancestors.push(ancestor);
      ancestor = findParent(ancestor);
    }
    for (var i = 0; i < bookKeeping.ancestors.length; i++) {
      topLevelTarget = bookKeeping.ancestors[i];
      var topLevelTargetID = ReactMount.getID(topLevelTarget) || '';
      ReactEventListener._handleTopLevel(bookKeeping.topLevelType, topLevelTarget, topLevelTargetID, bookKeeping.nativeEvent, getEventTarget(bookKeeping.nativeEvent));
    }
  }
  function handleTopLevelWithPath(bookKeeping) {
    var path = bookKeeping.nativeEvent.path;
    var currentNativeTarget = path[0];
    for (var i = 0; i < path.length; i++) {
      var currentPathElement = path[i];
      var currentPathElemenId = ReactMount.getID(currentPathElement);
      if (currentPathElement.nodeType === DOCUMENT_FRAGMENT_NODE_TYPE) {
        currentNativeTarget = path[i + 1];
      }
      if (ReactMount.isRenderedByReact(currentPathElement)) {
        var newRootId = ReactInstanceHandles.getReactRootIDFromNodeID(currentPathElemenId);
        bookKeeping.ancestors.push(currentPathElement);
        var topLevelTargetID = ReactMount.getID(currentPathElement) || '';
        ReactEventListener._handleTopLevel(bookKeeping.topLevelType, currentPathElement, topLevelTargetID, bookKeeping.nativeEvent, currentNativeTarget);
        while (currentPathElemenId !== newRootId) {
          i++;
          currentPathElement = path[i];
          currentPathElemenId = ReactMount.getID(currentPathElement);
        }
      }
    }
  }
  function scrollValueMonitor(cb) {
    var scrollPosition = getUnboundedScrollPosition(window);
    cb(scrollPosition);
  }
  var ReactEventListener = {
    _enabled: true,
    _handleTopLevel: null,
    WINDOW_HANDLE: ExecutionEnvironment.canUseDOM ? window : null,
    setHandleTopLevel: function(handleTopLevel) {
      ReactEventListener._handleTopLevel = handleTopLevel;
    },
    setEnabled: function(enabled) {
      ReactEventListener._enabled = !!enabled;
    },
    isEnabled: function() {
      return ReactEventListener._enabled;
    },
    trapBubbledEvent: function(topLevelType, handlerBaseName, handle) {
      var element = handle;
      if (!element) {
        return null;
      }
      return EventListener.listen(element, handlerBaseName, ReactEventListener.dispatchEvent.bind(null, topLevelType));
    },
    trapCapturedEvent: function(topLevelType, handlerBaseName, handle) {
      var element = handle;
      if (!element) {
        return null;
      }
      return EventListener.capture(element, handlerBaseName, ReactEventListener.dispatchEvent.bind(null, topLevelType));
    },
    monitorScrollValue: function(refresh) {
      var callback = scrollValueMonitor.bind(null, refresh);
      EventListener.listen(window, 'scroll', callback);
    },
    dispatchEvent: function(topLevelType, nativeEvent) {
      if (!ReactEventListener._enabled) {
        return ;
      }
      var bookKeeping = TopLevelCallbackBookKeeping.getPooled(topLevelType, nativeEvent);
      try {
        ReactUpdates.batchedUpdates(handleTopLevelImpl, bookKeeping);
      } finally {
        TopLevelCallbackBookKeeping.release(bookKeeping);
      }
    }
  };
  module.exports = ReactEventListener;
})(require("process"));
