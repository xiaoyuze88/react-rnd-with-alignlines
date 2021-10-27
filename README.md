# react-rnd-with-alignlines

> React draggable/resizable with align lines while dragging or resizing.
>
> This repository is a combination of [react-rnd](https://github.com/bokuweb/react-rnd) and [react-dragline](https://github.com/zcued/react-dragline) to fit our requirement. Thx to bokuweb and zcued for their excellent job. 
>
> This component is design to be fully controlled, and focus only on the Node elements' size and position.
> 
> It will be useful for building a page builder or something like it. 

## Install

### NPM
```bash
npm install --save react-rnd-with-alignlines
```

### Yarn
```bash
yarn add react-rnd-with-alignlines
```    

## Basic Usage

```tsx
import React, { useState } from 'react'
import { Container, INode } from 'react-alignment-guides'

function Node({
  style,
  node,
}) {
  return <div style={style}>{JSON.stringify(node)}</div>
}

const componentMap = { Node };

const nodes: INode[] = [
  {
    id: 'node1',
    position: {
      x: 150,
      y: 150,
      w: 150,
      h: 80,
    },
    // Container only require `id` and `position` props,
    // you can design your own render patterns and set whatever params you need here and use them in your render method.
    component: 'Node',
  },
  {
    id: 'node2',
    position: {
      x: 200,
      y: 200,
      w: 80,
      h: 80,
    },
    // For example, you can set `component` = Node or 'Node', and use them in your render method.
    component: Node,
  },
];

function Example() {
  const [nodes, setNodes] = useState<INode[]>(nodes);

  return (
    <Container
       nodes={nodes.map(node => ({
        ...node,
        render(props) {
          let Component = props.component;

          if (typeof node.component === 'string' && componentMap[node.component]) {
            Component = componentMap[node.component];
          }
  
          return <Component {...props}/>;
        }
      }))}
      onNodeMove={(nodeId, position, index) => {
        const nextNodes = [...nodes];
        nextNodes[index].position = position;
        setNodes(nextNodes);
      }}
    />
  )
}
```

## API

TODO
