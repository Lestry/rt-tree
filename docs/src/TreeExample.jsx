import React from 'react'

import Tree from '../../src/Tree'
import TreeNode from '../../src/TreeNode'
import { generateData } from './util'

class TreeExample extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selected: []
    }
  }

  componentDidMount() {
    this.setState({
      selected: ['0-0-0', '0-1-0', '0-1-1', '0-1-2']
    }) 
  }

  handleClick(node){
    console.log(node)
  }

  render() {
  	const customerNode = {
      onAdd: (node) => {
        return <a onClick={this.handleClick.bind(this,node)}>增加</a>
      },
      hover: true
    }
    return (
    	<div>
        <h3>单选</h3>
        <Tree commbox width={250} height={350} data={generateData()}  defaultChecked={['0-1-0']} defaultExpanded={['0-1']}/>

        <h3>多选</h3>
    		<Tree multiple commbox data={generateData()}  defaultChecked={['0-0-0', '0-1-0', '0-1-1', '0-1-2']} defaultExpanded={['0-1']}/>

        <h3>多选</h3>
        <Tree 
          multiple 
          data={generateData(10, 5, 2)}  
          defaultSelected={this.state.selected}  
          selected={this.state.selected} 
          defaultExpanded={['0-1']}
          customerNode={customerNode}
        />
    	</div>     
    );

  }
}

export default TreeExample;
