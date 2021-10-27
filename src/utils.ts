import kebabCase from 'kebab-case';
import { DefaultDirections, DirectionKey, NodePosition, NodePositionData } from './Container';

export const checkDragOut = (nodePositionData: NodePosition, $container: HTMLElement): NodePosition => {
  let { x, y, w, h } = nodePositionData;

  const maxLeft = $container.clientWidth - w
  const maxTop = $container.clientHeight - h


  if (x < 0) {
    x = 0
  } else if (x > maxLeft) {
    x = maxLeft
  }

  if (y < 0) {
    y = 0
  }
  if (y > maxTop) {
    y = maxTop
  }

  return { x, y, w, h };
};

export const checkArrayWithPush = (target, key, value) => {
  if (Array.isArray(target[key])) {
    target[key].push(value)
  } else {
    target[key] = [value]
  }
}

export const calcGuideLine = (
  currentNodePosData: NodePositionData,
  compareNodePosData: NodePositionData,
  key: DirectionKey,
  currentNodeDirections?: string[],
) => {
  if (!currentNodeDirections) {
    currentNodeDirections = DefaultDirections[key];
  }

  const compareNodeDirections = DefaultDirections[key];

  const results = [];

  const { origin, length } = calcLineValues(currentNodePosData, compareNodePosData, key)

  currentNodeDirections.forEach((currentDirection) => {
    compareNodeDirections.forEach((compareDirection) => {
      const result = {
        // 距离是否达到吸附阈值
        near: false,
        // 距离差
        dist: Number.MAX_SAFE_INTEGER,
        // 辅助线坐标
        value: 0,
        // 辅助线长度
        length,
        // 辅助线起始坐标（对应绝对定位的top/left）
        origin,
      }

      result.dist = currentNodePosData[currentDirection] - compareNodePosData[compareDirection];
      result.value = compareNodePosData[compareDirection];

      // this.props.threshold
      if (Math.abs(result.dist) < 5 + 1) {
        result.near = true
      }

      results.push(result);
    });
  });

  return results;
};


export const calcPosValues = (
  currentNodePosData: NodePositionData,
  compareNodePosDataList: NodePositionData[],
  key: DirectionKey,
  directions?: string[],
) => {
  const results = {};

  getGuideLines(
    currentNodePosData,
    compareNodePosDataList,
    key,
    directions,
  ).forEach(result => {
    const { i, near, dist, value, origin, length } = result;
    if (near) {
      checkArrayWithPush(results, dist, {
        i,
        value,
        origin,
        length
      })
    }
  });

  const resultArray = Object.entries(results)
  if (resultArray.length) {
    // 如果有多个命中，则找出最近的一个
    const [minDistance, activeCompares]: any = resultArray.sort(([dist1], [dist2]) => Math.abs(dist1 as any) - Math.abs(dist2 as any))[0]
    const dist = parseInt(minDistance)
    return {
      v: currentNodePosData[key] - dist,
      dist: dist,
      lines: activeCompares,
      indices: activeCompares.map(({ i }) => i),
    }
  }

  return {
    v: currentNodePosData[key],
    dist: 0,
    lines: [],
    indices: [],
  }
}

// 找出该方向所有可能的辅助线
export const getGuideLines = (
  currentNodePosData: NodePositionData,
  compareNodePosDataList: NodePositionData[],
  key: DirectionKey,
  directions?: string[],
) => {
  let results = [];

  compareNodePosDataList.forEach((compareNodePosition) => {
    const guideLineResults = calcGuideLine(currentNodePosData, compareNodePosition, key, directions);

    guideLineResults.forEach((result) => {
      results.push({
        i: compareNodePosition.i,
        ...result,
      })
    });
  });

  return results;
};

export const getMaxDistance = (arr) => {
  const num = arr.sort((a, b) => a - b)
  return num[num.length - 1] - num[0]
}

// 计算辅助线的长度和距离原点的距离
// length为该方向上，距离最远的距离，如： t1/b1/t2/b2 几个点最大的距离（即元素1最高点到元素2最低点的距离）
// origin 为该方向上4个点距离原点最近的一个点离对应坐标轴的距离
export const calcLineValues = (
  targetPositionData: NodePositionData,
  compareNodePosition: NodePositionData,
  key: DirectionKey,
) => {
  const { x, y, h: H, w: W } = targetPositionData
  const { l, r, t, b } = compareNodePosition
  const
    T = y,
    B = y + H,
    L = x,
    R = x + W

  const direValues = {
    x: [t, b, T, B],
    y: [l, r, L, R],
  }

  const length = getMaxDistance(direValues[key])
  const origin = Math.min(...direValues[key])

  return { length, origin }
}

const resizableDirections = [
  'top',
  'left',
  'right',
  'bottom',
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
];

const handleStyleKey = [
  'width',
  'height',
  'position',
  'left',
  'top',
  'cursor',
  'userSelect',
  'right',
  'bottom',
];

export const genReplaceResizeHandleStyles = () => {
  const replaceResizeHandleStyles = {};
  resizableDirections.forEach(direction => {
    replaceResizeHandleStyles[direction] = {};

    handleStyleKey.forEach(key => replaceResizeHandleStyles[direction][key] = undefined);
  });

  return replaceResizeHandleStyles;
};

export const toKebabCase = (string) => {

};

export const genHandleClasses = () => {
  const classes = {};
  resizableDirections.forEach(direction => {
    classes[direction] = `resizable-handler resizable-handle-${kebabCase(direction)}`;
  });

  return classes;
}

export const noop: any = () => {};
