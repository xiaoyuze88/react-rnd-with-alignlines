import React, { useRef } from 'react';
import { DraggableCore, DraggableData } from 'react-draggable';
import { Resizable, ResizableProps } from 're-resizable';
import classNames from 'classnames';
import { Direction, INode, NodePosition, StyledProps } from './Container';
import { genHandleClasses, genReplaceResizeHandleStyles } from './utils';

const directionSplitReg = /[A-Z]/;

const replaceResizeHandleStyles = genReplaceResizeHandleStyles();
const handleClasses = genHandleClasses();

// 解析direction，并转为简化版
// 'topLeft' => ['top', 'left'] => ['t', 'l']
const parseDirection = (direction): Direction[] => {
  let result = [];

  const matches = direction.match(directionSplitReg);

  if (!matches) {
    result = [direction];
  } else {
    result = [
      direction.substring(0, matches.index),
      direction.substring(matches.index).toLowerCase(),
    ];
  }

  return result.map((direction) => {
    switch (direction) {
      case 'top':
        return 't';
      case 'bottom':
        return 'b';
      case 'left':
        return 'l';
      case 'right':
        return 'r';
    }
  });
};

type DragEvent = React.MouseEvent<HTMLElement | SVGElement>
  | React.TouchEvent<HTMLElement | SVGElement>
  | MouseEvent
  | TouchEvent;

export interface INodeProps extends StyledProps {
  node: INode;
  onDrag: (e: DragEvent, data: { x: number; y: number }) => any;
  onDragStart: (e: DragEvent, data: DraggableData) => any;
  onDragStop: (e: DragEvent, data: DraggableData) => any;
  onResize: (e: DragEvent, directionList: Direction[], nextPosition: NodePosition) => any;
  onResizeStart: (e: DragEvent, directionList: Direction[]) => any;
  onResizeStop: (e: DragEvent, directionList: Direction[], delta: { width: number; height: number }) => any;
  onClick?: (e: DragEvent, node: INode, element: HTMLElement) => any;
  snap?: { x?: number[], y?: number[] };
  snapGap?: number;
  active?: boolean;
  hover?: boolean;
  resizableProps?: ResizableProps;
}

export function Node({
  onDrag,
  onDragStart,
  onDragStop,
  onResize,
  onResizeStart,
  onResizeStop,
  onClick,
  node,
  snap,
  snapGap = 5,
  active,
  hover,
  className,
  style,
  resizableProps,
}: INodeProps) {
  const $nodeRef = useRef(null);
  const dragStartDataRef = useRef<{
    x: number;
    y: number;
    w?: number;
    h?: number;
  } | null>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });
  // 记录起拖点信息，来判断是否是一个click（borrowed from fastclick）
  const fastClickRef = useRef<{
    tracking: boolean;
    start?: number;
    x?: number;
    y?: number;
  }>({
    tracking: false,
    start: 0,
    x: 0,
    y: 0,
  });

  const {
    position: { x, y, w, h },
    render,
  } = node;

  const doDragStart = (e, data) => {
    fastClickRef.current = {
      tracking: true,
      start: Date.now(),
      x: data.lastX,
      y: data.lastY,
    };
    // 记录起拖点和node原点的偏移量
    dragStartDataRef.current = {
      x: data.lastX - x,
      y: data.lastY - y,
    };

    onDragStart(e, data);
  };

  const doDragMove = (e, data) => {
    fastClickRef.current = {
      tracking: false,
    }
    onDrag(e, {
      x: data.lastX - dragStartDataRef.current.x,
      y: data.lastY - dragStartDataRef.current.y,
    });
  };

  const doDragStop = (e, data) => {
    const { tracking, x, y, start } = fastClickRef.current;
    // fastclick是700，我觉得300够了？
    if (tracking && Date.now() - start < 700 && data.x - x < 10 && data.y - y < 10) {
      if (typeof onClick === 'function') {
        onClick(e, node, $nodeRef.current.resizable);
      }
    }

    fastClickRef.current = { tracking: false };
    dragStartDataRef.current = null;
    onDragStop(e, data);
  };

  const doResizeStart = (e, direction) => {
    e.stopPropagation();
    // 记录起拖点的位置信息
    dragStartDataRef.current = {
      x, y, w, h,
    };
    onResizeStart(e, parseDirection(direction));
  };

  const doResize = (e, direction, eleRef, {
    width: deltaX,
    height: deltaY,
  }) => {
    e.stopPropagation();

    const directionList = parseDirection(direction);
    const originPositionData = dragStartDataRef.current;

    const nextPosition = {
      x, y, w, h
    };

    const handlers = {
      t() {
        nextPosition.h = originPositionData.h + deltaY;
        nextPosition.y = originPositionData.y - deltaY;
      },
      l() {
        nextPosition.w = originPositionData.w + deltaX;
        nextPosition.x = originPositionData.x - deltaX;
      },
      r() {
        nextPosition.w = originPositionData.w + deltaX;
      },
      b() {
        nextPosition.h = originPositionData.h + deltaY;
      },
    };

    directionList.forEach(direction => handlers[direction]());

    onResize(e, directionList, nextPosition);
  };

  const doResizeStop = (e, direction, delta) => {
    e.stopPropagation();
    dragStartDataRef.current = null;
    onResizeStop(e, direction, delta);
  };

  return (
    <DraggableCore
      onStart={doDragStart}
      onDrag={doDragMove}
      onStop={doDragStop}
    >
      <Resizable
        size={{ width: w, height: h }}
        snap={snap}
        snapGap={snapGap}
        onResizeStart={doResizeStart}
        onResize={doResize}
        onResizeStop={doResizeStop}
        enable={active ? undefined : {}}
        className={classNames('react-rnd-dragline-node', className, `react-rnd-dragline-node_id_${node.id}`, {
          actived: active,
          hover,
        })}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${x}px, ${y}px)`,
          ...style,
        }}
        bounds={'parent'}
        boundsByDirection={true}
        ref={$nodeRef}
        // 覆盖inline样式
        handleStyles={replaceResizeHandleStyles}
        // 默认resize handler没class，赋个默认值
        handleClasses={handleClasses}
        {...resizableProps}
      >
        {render({
          node,
          style: {
            width: '100%',
            height: '100%',
          }
        })}
      </Resizable>
    </DraggableCore>
  )
}
