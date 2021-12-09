import React, { MutableRefObject, useMemo, useRef, useState } from 'react';
import { INodeProps, Node } from './Node';
import classNames from 'classnames';
import { ResizableProps } from 're-resizable';
import 'document.contains';
import './styles.less';
import { calcLineValues, calcPosValues, checkDragOut, getGuideLines, getPaddingArr, noop } from './utils';

/**
 * 表示组件支持通过 className 和 style 进行样式定制
 */
export interface StyledProps {
  /**
   * 组件自定义类名
   */
  className?: string;

  /**
   * 组件自定义样式
   */
  style?: React.CSSProperties;
}

export interface INode {
  id: string;
  position: NodePosition;
  render: (props: {
    node: INode;
    style: React.CSSProperties;
    [propKey: string]: any;
  }) => React.ReactElement;
  disabled?: boolean;
  style?: React.CSSProperties;

  [extendPropName: string]: any;
}

export type DirectionKey = 'x' | 'y';

const createNodePositionData = ({ x, y, w, h, ...others }): NodePositionData => ({
  ...others,
  x,
  y,
  w,
  h,
  l: x,
  r: x + w,
  t: y,
  b: y + h,
  lr: x + w / 2,
  tb: y + h / 2,
});

export interface NodePosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NodePositionData {
  i?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  l: number;
  r: number;
  t: number;
  b: number;
  lr: number;
  tb: number;
}

interface GuideLinePositionData {
  i: number;
  $: HTMLElement;
  value: number; // 该方向的位移
  length: number; // 长度
  origin: number; // 距离该方向坐标轴距离
}

export type Direction = 'l' | 'r' | 't' | 'b';

export const DefaultDirections = {
  x: ['l', 'r', 'lr'],
  y: ['t', 'b', 'tb'],
}

export interface IContainer {
  nodes: INode[];
  onChange?: (nodes: INode[]) => any;
  onNodeMove?: (id: string, position: NodePosition, nodeIndex: number) => any;
  containerStyle?: React.CSSProperties;
  containerClassName?: string;
  nodeStyle?: React.CSSProperties;
  nodeClassName?: string;
  resizableProps?: ResizableProps;
  activeNodeId?: string;
  hoverNodeId?: string;
  onClickNode?: INodeProps['onClick'];
  containerRef?: MutableRefObject<any>;
  mapNodeProps?: (node: INode, index: number) => any;
  paddingSnap?: number | number[];
}

export function unique(array, compare = (a, b) => a === b) {
  const result = []
  for (let i = 0, len = array.length; i < len; i++) {
    const current = array[i]
    if (result.findIndex(v => compare(v, current)) === -1) {
      result.push(current)
    }
  }
  return result
}

export function Container({
  nodes = [],
  onChange = noop,
  onNodeMove = noop,
  containerStyle,
  containerClassName,
  nodeStyle,
  nodeClassName,
  resizableProps,
  activeNodeId,
  hoverNodeId,
  onClickNode = noop,
  containerRef,
  mapNodeProps = noop,
  paddingSnap,
}: IContainer) {
  const $container = useRef(null);
  const $containerRef = containerRef || $container;
  const $children = useRef(null);
  const [resizeSnap, setResizeSnap] = useState<any>({});
  const [guideLines, setGuideLines] = useState<{
    indices: number[];
    vLines: GuideLinePositionData[];
    hLines: GuideLinePositionData[];
  }>({
    indices: [],
    vLines: [],
    hLines: [],
  });
  const containerPosition = useMemo<NodePositionData>(() => {
    if ($containerRef.current) {
      return createNodePositionData({
        x: 0, y: 0, w: $containerRef.current.clientWidth, h: $containerRef.current.clientHeight,
      });
    }
    return null;
  }, [$containerRef.current]);

  // 如果设置了容器 padding 辅助，则往四个角放上参照物，算辅助线的时候算上它们
  const paddingSnapPositionArr = useMemo(() => {
    if (!containerPosition) return [];

    const paddingArr = getPaddingArr(paddingSnap);

    if (!paddingArr) return [];

    const [top, right, bottom, left] = paddingArr;
    const { w, h } = containerPosition;

    // 给两个容器：
    // 1. 左右padding的容器上下吸顶
    // 2. 上下padding的左右吸顶，这样出来的吸附线不会太奇怪
    return [
      createNodePositionData({
        x: left,
        y: 0,
        w: w - left - right,
        h: h,
      }),
      createNodePositionData({
        x: 0,
        y: top,
        w: w,
        h: h - top - bottom,
      }),
    ];
  }, [paddingSnap, containerPosition]);

  const getCompareNodePosDataList = (currentNodeIndex: number): NodePositionData[] => {
    const compareNodePosDataList = $children.current.filter((_, i) => i !== currentNodeIndex);

    return [
      ...compareNodePosDataList,
      containerPosition,
      ...paddingSnapPositionArr,
    ];
  };

  const calcAndDrawLines = (
    currentNodePosData: NodePositionData,
    compareNodePosDataList: NodePositionData[],
    directions = DefaultDirections,
  ) => {
    const { v: x, indices: indices_x, lines: vLines } = calcPosValues(currentNodePosData, compareNodePosDataList, 'x', directions.x);
    const { v: y, indices: indices_y, lines: hLines } = calcPosValues(currentNodePosData, compareNodePosDataList, 'y', directions.y);

    const indices = unique(indices_x.concat(indices_y));

    // TODO: x/y轴同时出辅助线且被吸附时，持续微拖会看到辅助线挪动
    // https://github.com/zcued/react-dragline/issues/9
    if (vLines.length && hLines.length) {
      vLines.forEach(line => {
        const compare = compareNodePosDataList.find(({ i }) => i === line.i)
        const { length, origin } = calcLineValues(currentNodePosData, compare, 'x')

        line.length = length
        line.origin = origin
      })


      hLines.forEach(line => {
        const compare = compareNodePosDataList.find(({ i }) => i === line.i)
        const { length, origin } = calcLineValues(currentNodePosData, compare, 'y')

        line.length = length
        line.origin = origin
      })
    }

    setGuideLines({
      vLines,
      hLines,
      indices,
    });

    return { x, y }
  }

  const onDrag = (index, { x, y }) => {
    const newNodes = [...nodes];

    const targetPositionData = $children.current[index];

    let nextPosition: NodePosition = {
      w: targetPositionData.w,
      h: targetPositionData.h,
      x,
      y,
    };

    nextPosition = checkDragOut(nextPosition, $containerRef.current);

    const compareNodePosDataList = getCompareNodePosDataList(index);

    const currentNodePosData = createNodePositionData(nextPosition);

    const snapPosition = calcAndDrawLines(currentNodePosData, compareNodePosDataList);

    nextPosition.x = snapPosition.x;
    nextPosition.y = snapPosition.y;

    onNodeMove(newNodes[index].id, nextPosition, index);

    newNodes[index].position = nextPosition;

    onChange(newNodes);
  };

  // 拖拽初始时 计算出所有元素的坐标信息，存储于this.$children
  const onStart = () => {
    $children.current = nodes.map((node, i) => {
      const { x, y, w, h } = node.position;

      return createNodePositionData({ x, y, w, h, i });
    });
  };

  const onStop = () => {
    setGuideLines({ vLines: [], hLines: [], indices: [] });
  }

  const getDirections = (directionList) => {
    const directions = {
      x: [],
      y: [],
    };

    directionList.forEach((direction) => {
      switch (direction) {
        case 't':
        case 'b':
          directions.y.push(direction);
          break;
        case 'l':
        case 'r':
          directions.x.push(direction);
          break;
      }
    });

    return directions;
  };

  const onResizeStart = (index, directionList) => {
    onStart();

    const currentNodePosData = $children.current[index];
    const compareNodePosDataList = getCompareNodePosDataList(index);

    if (compareNodePosDataList.length) {
      const snap: any = {};
      const directions = getDirections(directionList);

      // snap 是指的需要吸附的宽高，这里需要把吸附点与当前点的相对位置换算成对应位置时的宽高
      snap.x = getGuideLines(currentNodePosData, compareNodePosDataList, 'x', directions.x)
        .map(result => {
          return currentNodePosData.w - (result.value - currentNodePosData.x);
        });
      snap.y = getGuideLines(currentNodePosData, compareNodePosDataList, 'y', directions.y)
        .map(result => {
          return currentNodePosData.h - (result.value - currentNodePosData.y);
        });

      if (snap.x.length || snap.y.length) {
        setResizeSnap(snap);
      }
    }
  };

  const onResizeStop = () => {
    setResizeSnap({});
    setGuideLines({ vLines: [], hLines: [], indices: [] });
  };

  const onResize = (index, directionList, { w, h, x, y }) => {
    const newNodes = [...nodes];
    const nextPosition = {
      x, y, w, h
    };

    const compareNodePosDataList = getCompareNodePosDataList(index);

    if (compareNodePosDataList.length) {
      const currentNodePosData = createNodePositionData(nextPosition);

      const directions = getDirections(directionList);

      // 只用展示辅助线，不用处理吸附，吸附在起拖时就计算好了
      // TODO：Resize有无处理容器和padding？
      calcAndDrawLines(currentNodePosData, compareNodePosDataList, directions);
    }

    onNodeMove(newNodes[index].id, nextPosition, index);

    newNodes[index] = {
      ...newNodes[index],
      position: nextPosition,
    };

    onChange(newNodes);
  };

  const renderNodes = () => {
    return nodes.map((node, index) => {
      let extendProps: any = {};

      if (typeof mapNodeProps === 'function') {
        try {
          extendProps = mapNodeProps(node, index);
        } catch (err) {
          console.warn('mapNodeProps error', err);
        }
      }

      const { style: extendStyle, ...otherExtendProps } = extendProps;

      return (
        <Node
          key={node.id || index}
          node={node}
          onDrag={(e, { x, y }) => onDrag(index, { x, y })}
          onDragStart={onStart}
          onDragStop={onStop}
          onResize={(e, direction, delta) => onResize(index, direction, delta)}
          onResizeStart={(e, direction) => onResizeStart(index, direction)}
          onResizeStop={() => onResizeStop()}
          snap={resizeSnap}
          active={activeNodeId === node.id}
          hover={hoverNodeId === node.id}
          className={nodeClassName}
          style={{
            ...nodeStyle,
            ...extendStyle,
            ...node.style,
          }}
          resizableProps={resizableProps}
          onClick={(e, node, element) => {
            onClickNode(e, node, element);
          }}
          disabled={node.disabled}
          {...otherExtendProps}
        />
      );
    });
  }

  const renderGuidelines = () => {
    const { vLines, hLines } = guideLines;

    return (
      <>
        {vLines.map(({ length, value, origin }, i) => (
          <span
            className="v-line"
            key={`v-${i}`}
            style={{
              position: 'absolute',
              backgroundColor: '#FF00CC',
              left: 0,
              top: 0,
              transform: `translate(${value}px, ${origin}px)`,
              height: length,
              width: 1,
            }}
          />
        ))}
        {hLines.map(({ length, value, origin }, i) => (
          <span
            className="h-line"
            key={`h-${i}`}
            style={{
              width: length,
              height: 1,
              left: 0,
              top: 0,
              transform: `translate(${origin}px, ${value}px)`,
              position: 'absolute',
              backgroundColor: '#FF00CC',
            }}
          />
        ))}
      </>
    )
  };

  return (
    <div
      className={classNames('react-rnd-dragline-container', containerClassName)}
      style={containerStyle}
      ref={$containerRef}
    >
      {renderNodes()}
      {renderGuidelines()}
    </div>
  )
}
