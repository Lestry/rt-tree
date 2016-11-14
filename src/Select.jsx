import React, { PropTypes } from 'react'
import ReactDOM from 'react-dom'
import classnames from 'classnames'
import DataTree from './helpers/dataTree'
import { 
  noop,
  ownerDocument, 
  addEventListener,
  TREE_ELEMENT, 
  LIST_ELEMENT
} from './helpers/util'

class Select extends React.Component {

  constructor(props) {
    super(props);

    [
      'onExpand',
      'onSelect',
      'onCheck',
      'onChange',
      'toggleMenuVisible',
      'handleSearchInputChange',
      'handleDocumentClick'
    ].forEach((m)=> {
      this[m] = this[m].bind(this);
    });

    this.state = {
      /**
       * 用于渲染下拉菜单的数据，取自于Tree.props.data或List.props.data
       * 因为有搜索功能，这个data在搜索时会发生变化，所以需要在这里维护
       * @type {[type]}
       */
      data: [],
      /**
       * 显示、隐藏下拉菜单的标识
       * @type {Boolean}
       */
      menuVisible: false,
      /**
       * 树节点展开列表（搜索时用到，这里需要接管Tree.props.expanded）
       * @type {Array}
       */
      expanded: [],
      /**
       * 下拉框在选择后，输入框显示的值
       * @type {String}
       */
      inputValue: props.inputValue,
      /**
       * 搜索框显示的值
       * @type {String}
       */
      searchInputValue: undefined
    }
    /**
     * 初始化状态标识
     * 数据一般都是异步加载，在生成Component时，由于props.data为空，导致props.defaultChecked等值无效
     * 这里折中处理下，加一个状态标识，以便在props.data第一次不为空的情况下，取值于defaultChecked，而不是取值于checked
     */
    this.initial = true
    /**
     * 存储Tree, List组件的原有数据和事件
     */
    this.menuProps = {
      data: [],
      onExpand: noop,
      onSelect: noop,
      onCheck: noop,
      onChange: noop
    }
    /**
     * 当前下拉菜单中的有效组件类型，Tree, List
     */
    this.menuType = null
    this.searchInputRef = 'search-input'
    this.initializeMenuProps(props)

    /**
     * 存储tree数据的类对象，用于数据搜索
     */
    this.dataTree// = new DataTree().import()
    /**
     * 用于阻止事件冒泡，参考react-overlay的做法
     */
    // 用了symbol 命名后，导致栈溢出.. 原因未知
    this._suppressRootId = '__click_rt_select_was_inside__'
    this._suppressRootCloseHandler = (event) => {
      event.nativeEvent[this._suppressRootId] = true
      event.stopPropagation()
    }
  }

  componentDidMount() {

  }

  componentWillUnmount() {
    this.unbindRootCloseHandlers()
  }

  componentWillReceiveProps(nextProps) {
    this.initializeMenuProps(nextProps)
  }

  render() {
  	const { className, prefixCls, children, onClear, ...otherProps } = this.props

    return (
    	<div {...otherProps} className={classnames(className, prefixCls)}>
    		<div className={`${prefixCls}-head`} onClick={this.toggleMenuVisible}>
          <label title={this.state.inputValue || this.props.placeholder}>{this.state.inputValue || this.props.placeholder}</label>
          {this.state.inputValue && onClear ? <span className="clear-value-icon" onClick={this.clearSelected.bind(this)}>×</span> : null}
          <div className="dropdown-toggle"><i/></div>
        </div>
        {this.renderMenu()}
    	</div>      
    );
  }

  renderMenu() {
    const { prefixCls, children, menuStyle, emptyDataText, search, searchInputPlaceholder } = this.props
    const { menuVisible, searchInputValue } = this.state
    const style = {...(menuStyle || {}), display: menuVisible ? 'block' : 'none'}
    
    return (
      <div style={style} className={`${prefixCls}-menu`} onClick={this._suppressRootCloseHandler}>
        {/** TODO: 是否有递归遍历其所有子节点，找到这里需要接管的组件（Tree, List）？**/}
        {React.Children.map(children, child => {
          // 节点为Tree组件时，给它添加相应的属性与事件，以便Tree和Select关联起来
          const elementType = this.isValidElement(child)
          if (elementType) {

            // 检查数据是否有更新
            if (child.props !== this.menuProps) {
              this.updateMenuProps(child, elementType)
            }

            // 这里获取最新数据
            const { data, expanded } = this.state
            let element
            
            if (!data || data.length <= 0) {
              element = (<p className="empty-data-text">{emptyDataText}</p>)
            } else {
              let props = {
                data: data,
                bordered: false, 
                expanded,
                onExpand: this.onExpand,
                onSelect: this.onSelect,
                onCheck: this.onCheck,
                onChange: this.onChange
              }

              element = React.cloneElement(child, props)
            }
            
            // 添加搜索框
            if (search) {
              element = (
                <div>
                  <div className="search-input-wrapper">
                    <input 
                      ref={this.searchInputRef} 
                      type="text" 
                      placeholder={searchInputPlaceholder}
                      value={searchInputValue}
                      onChange={this.handleSearchInputChange}/>
                    <i className="icon-search"/>
                  </div>
                  {element}
                </div>
              )
            }

            return element
          }

          return child
        })}
      </div>
    )
  }

  initializeMenuProps(props) {
    // TODO: 是否有必要遍历其所有子节点，找到这里需要接管的组件（Tree, List）？
    React.Children.forEach(props.children, child => {
      // 节点为Tree, List组件时，给它添加相应的属性与事件，以便Tree和Select关联起来
      const elementType = this.isValidElement(child)
      if (elementType) {
        this.updateMenuProps(child, elementType)
        return;
      }
    })

  }

  updateMenuProps(node, elementType) {
    // 把要接管的组件props存储起来，方便后面使用
    const { data, expanded, defaultExpanded } = node.props
    
    if (data !== this.menuProps.data ) {
      // 重置state
      this.state.data = data
      this.state.expanded = (this.initial ? (expanded || defaultExpanded) : expanded) || []
      // this.state.inputValue = null
      this.state.searchInputValue = null

      if (this.isTreeElement(elementType)) {
        this.dataTree = new DataTree().import(data.slice())
        // this.state.data = this.dataTree.export()
      }
    }

    // 如果menuProps.data已有数据，把initial设为false
    this.initial = !(this.initial && this.menuProps.data && this.menuProps.data.length > 0)
    this.menuProps = node.props
    this.menuType = elementType
    this.updateInputValue()
    
  }

  updateInputValue() {
    const { 
      data,
      commbox, 
      selected, 
      defaultSeleced, 
      checked, 
      defaultChecked
    } = this.menuProps

    let selectedValues, selectedDatas = []
    
    if (commbox) {
      selectedValues = (this.initial ? (checked || defaultChecked) : checked) || []
    } else {
      selectedValues = (this.initial ? (selected || defaultSeleced) : selected) || []
    }

    // 根据节点选中项设置inputValue
    selectedValues.forEach(value => {
      const node = this.dataTree.searchDFS((data) => {
        return data.id === value
      })
      node && selectedDatas.push(node.data())
    })

    let inputValue = selectedDatas.map(o => o.text).join(', ')
    this.initial ? (this.state.inputValue = inputValue) : this.setState({ inputValue })
  }

  /**
   * 判断是否有效的Tree, List组件，如果是，返回组件的类型，否则还回false
   * 由于并不依懒于Tree, List组件，所以这里仅以它的displayName来判断
   */
  isValidElement(element) {
    const elementType = element.type ? element.type.elementType : undefined
    return elementType && (this.isTreeElement(elementType) || this.isListElement(elementType)) ? elementType : false
  }

  isTreeElement(elementType) {
    return (elementType || this.menuType) === TREE_ELEMENT
  }

  isListElement(elementType) {
    return (elementType || this.menuType) === LIST_ELEMENT
  }

  bindRootCloseHandlers() {
    const doc = ownerDocument(this);
    this._onDocumentClickListener = addEventListener(doc, 'click', this.handleDocumentClick);
  }

  unbindRootCloseHandlers() {
    if (this._onDocumentClickListener) {
      this._onDocumentClickListener.remove();
    }
  }

  handleDocumentClick(e) {
    // This is now the native event.
    if (e[this._suppressRootId]) {
      return;
    }
    this.toggleMenuVisible()
  }

  toggleMenuVisible() {
    this.setState({
      menuVisible: !this.state.menuVisible
    }, () => {
      if (this.state.menuVisible) {
        this.bindRootCloseHandlers()
        
        // 让搜索框获得焦点
        if (this.props.search) {
          const input = this.refs[this.searchInputRef]
          input && input.focus()
        }
      } else if (!this.state.menuVisible) {
        this.unbindRootCloseHandlers()
      }
    })
  }

  onExpand(expanded, node) {
    const nodeValue = node.props.value
    // 这里维护Tree.props.expanded的值，因为在搜索时，会用到
    this.setState({
      expanded: expanded ? [...this.state.expanded, nodeValue] : this.state.expanded.filter(item => item !== nodeValue)
    })
    this.menuProps.onExpand(expanded, node)
  }

  onSelect(selected, value, data, node) {
    return this.onEvent('select', selected, value, data, node)
  }

  onCheck(checked, value, data, node) {
    return this.onEvent('check', checked, value, data, node)
  }

  onEvent(eventType, selected, value, data, node) {
    const { selectToClose } = this.props
    const { multiple, onSelect, onCheck } = this.menuProps
    let result

    switch (eventType) {
      case 'select': (
        result = onSelect(selected, value, data, node)
      ); break;
      case 'check': (
        result = onCheck(selected, value, data, node)
      ); break;
    }

    if (!multiple && selected && selectToClose && result !== false) {
      this.toggleMenuVisible()
    }

    return result
  }

  selectToClose() {
    const { selectToClose } = this.props
    const { multiple } = this.menuProps
    // 单选时，如果选中了选项，关闭下拉菜单
    if (!multiple && selected && selectToClose) {
      this.toggleMenuVisible()
    }
  }

  onChange(value, data, node) {
    this.menuProps.onChange(value, data, node)
  }

  setInputValue(data, initial) {
    let inputValue
    // 把数据更新到input
    if (data) {
      if (Array.isArray(data)) {
        data.length > 0 && (inputValue = data.map(o => o.text).join(', '))
      } else {
        inputValue = data.text
      }  
    }
    initial ? (this.state.inputValue = inputValue) : this.setState({ inputValue })
  }

  clearSelected(e) {
    e.stopPropagation()
    this.props.onClear && this.props.onClear()
  }

  handleSearchInputChange() {
    const searchInputValue = this.refs[this.searchInputRef].value
    let result

    // 使用输入法时，每次keyDown都会触发该onChange事件，但input的值实际上还没变更，这里判断一下
    if (searchInputValue !== this.state.searchInputValue) {
      // 过滤节点数据
      if (this.isTreeElement()) {
        result = this.filterTreeDatas(searchInputValue)
      } else {
        result = this.filterListDatas(searchInputValue)
      }
      
      this.setState({
        ...(result || {}),
        searchInputValue
      })
    }
  }

  filterTreeDatas(keyWord) {
    const { data } = this.menuProps
    let expanded = []
    if (!keyWord) {
      return {data}
    }
    // 重置树节点数据
    const tree = this.dataTree
    tree.import(data.slice())
    // 使用深度优先搜索算法搜索树节点
    tree.traverseDFS((node) => {
      // 如果存在多各根节点的情形
      if (node._depth == 1 && node._childNodes.length > 1) {
        node._childNodes.forEach(nodeItem => {
          this.loopDFS_keyWord(nodeItem,expanded,keyWord)
        })
      } else {
        this.loopDFS_keyWord(node,expanded,keyWord)
      }
    })

    const afterFilter = this.filterExpanedTree( tree.export() )
    // 重置
    this.dataTree.import(data.slice())

    // 只搜索到一个节点时，不展开该节点
    if (expanded.length === 1) return { data:afterFilter, expanded: [] };
    else if (expanded.length > 1) return { data:afterFilter, expanded };
    else return { data: null }

  }
  
  loopDFS_keyWord(node, expanded, keyWord) {
    const nodeData = node.data()
    if (nodeData.text.indexOf( keyWord ) > -1) {
      expanded.push( nodeData.id )
      Object.assign(nodeData,{expanded: true})
      //获取它所有的祖先节点，把它的ID放到map中
      node.getAncestry().forEach(item => {
        const id = item.data().id
        item.data({...item.data(), expanded: true})
        if (this.contains(id, expanded) === false) {
          expanded.push( id )
        }
      })
    }else{
      // 为避免上次记录被保存，没有展开的再次遍历，设置false
      Object.assign(nodeData,{expanded: false})
    }
  }

  // 数组中是否包含  
  contains(id, arr) {
    let bool = false
    arr.map(item => {
      if (item == id) {
        return bool = true
      }
    })
    return bool
  } 

  // 对过滤展开的树进行递归筛选
  filterExpanedTree(treeDatas) {
    const tree = []
    const loopTree = (trees, store) => {
      Array.isArray(trees) && trees.map(item => {
        if (item.expanded === true) {
          const { children, ...node} = item
          const childrens = this.childNodeHasExpaned(item.children) ? [] : item.children
          Object.assign(node,{children: childrens})
          store.push(node)  
          loopTree(item.children, node.children)
        }
      }) 
    }
    loopTree(treeDatas, tree)
    return tree
  }

  filterListDatas(keyWord) {
    // TODO
  }
  // 判断其孩子中是否包含需要展开的节点。
  childNodeHasExpaned(children) {
    // 假设没有
    let bool = false
    Array.isArray(children) && children.forEach(item => {
      if (item.expanded === true) {
        return bool = true
      }
    })
    return bool
  }

}

Select.propTypes = {
  /**
   * 下拉菜单的style
   * @type {Object}
   */
  menuStyle: PropTypes.object,
  /**
   * 数据为空时，显示的文本信息
   * @type {String}
   */
  emptyDataText: PropTypes.string,
  /**
   * 是否启用节点过滤功能
   * @type {Boolean}
   */
  search: PropTypes.bool,
  /**
   * 查询框的placeholder值
   */
  searchInputPlaceholder: PropTypes.string,
  /**
   * 选中时，是否自动关闭下拉菜单（仅单选有效）
   */
  selectToClose: PropTypes.bool,
  /**
   * onClear 
   */
  onClear: PropTypes.func,
  /**
   * [placeholder description]
   * @type {[type]}
   */
  placeholder: PropTypes.string
}

Select.defaultProps = {
  prefixCls: 'rt-select',
  emptyDataText: '没有可显示的数据',
  searchInputPlaceholder: '搜索',
  selectToClose: true
}

export default Select;
