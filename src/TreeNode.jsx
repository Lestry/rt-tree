import React, { PropTypes } from 'react'
import classnames from 'classnames'
import $ from "jquery";
window.$ = window.jQuery = $;
import { noop, CHECKBOX_CHECKED, CHECKBOX_UNCHECKED, CHECKBOX_PARTIAL, booleanToCheckState } from './helpers/util'

class TreeNode extends React.Component {

  constructor(props) {
    super(props);

    [
      'onExpand',
      'onSelect',
      'onCheck'
    ].forEach((m)=> {
      this[m] = this[m].bind(this);
    });
  }

  render() {
    const props = this.props
    const { value, text, selected, multiple, commbox, checked, expanded, qtip, prefixCls, className, children, customerNode, disabled, customerIcon } = props
    const classes = {
      [prefixCls]: true,
      // 展开节点后的样式
      [`${prefixCls}-expanded`]: expanded,
      [`${prefixCls}-selected`]: selected,
      [`${prefixCls}-checked`]: checked,
      [`${prefixCls}-disabled`]: disabled // 是否禁用
    }
  	
    return (
    	<li className={classnames(className, classes)} onMouseOver={this.handleHoverCustomer.bind(this,'in')} onMouseOut={this.handleHoverCustomer.bind(this,'out')} aria-value={value} aria-expanded={expanded} aria-selected={selected}>
        {/** 叶节点，只添加空白的占位元素，用于文本对齐 **/}
        {this.isLeaf() ? <i /> : <i className="icon-arrow" onClick={this.onExpand}/>}
        {/** 添加commbox **/}
        {this.renderCommbox()}
        {customerIcon}
        <a onClick={this.onSelect} onDoubleClick={this.onExpand} title={qtip || text}>{text}</a>
        {children}
        {customerNode && this.renderCustomerNode()}
      </li>     
    );
  }

  renderCommbox() {
    const { multiple, commbox, checked } = this.props
    if (!commbox) {
      return null
    }

    const commboxPrefixCls = multiple ? 'icon-checkbox' : 'icon-radio'
    const commboxCls = `${commboxPrefixCls}-${checked}`

    return (
        <i className={commboxCls} onClick={this.onCheck} aria-checked={checked} />
      )
  }

  renderCustomerNode() {
    const { customerNode, data } = this.props
    return customerNode.onAdd && (
      <div className={classnames('customer-node',{hover: customerNode.hover})}>
        {customerNode.onAdd(data)}   
      </div>
    )
  }

  isLeaf() {
    const { leaf, expanded, children } = this.props
    return leaf || expanded && !children
  }

  /**
   * 渲染子节点
   */
  renderChildren() {
    const { tree, path, expanded, children } = this.props
    if (!tree || !children || !expanded) {
      return null
    }

    return (
        <ul>
          {React.Children.map(children, (child, index) => {
            return tree.renderTreeNode(child, index, this, path)
          }, tree)}
        </ul>
      )
  }

  handleHoverCustomer(type,e) {
    e.stopPropagation();
    const { customerNode, prefixCls } = this.props
    if(!(customerNode && customerNode.hover)) return false;

    let target = $(e.target)

    let straigtNode = target.hasClass(prefixCls) ? target : target.closest('.' + prefixCls)

    switch(type){
      case 'in' : {
        straigtNode.children('.customer-node').show()
      }; break;
      case 'out' : {
        straigtNode.find('.customer-node').hide()
      }; break;
    }
  }

  onExpand(e) {
    const { expanded, onExpand } = this.props
    onExpand(!expanded, this)
  }

  onSelect() {
    const { multiple, commbox, selected, onSelect, onCheck } = this.props
    // 单选，且存在commbox时，触发其onCheck事件
    if (!multiple && commbox) {
      onCheck(booleanToCheckState(!selected), this)
    } else {
      // 单选变更为已经选中的情况再次点击就直接关闭
      //
      multiple ? onSelect(!selected, this) : onSelect(true, this)
    }
  }

  onCheck() {
    const { checked, onCheck } = this.props
    // 选中状态，点击后，设为未选中状态，而半选或未选中状态在点击后，都将设为选中状态
    onCheck(checked === CHECKBOX_CHECKED ? CHECKBOX_UNCHECKED : CHECKBOX_CHECKED, this)
  }
}

TreeNode.propTypes = {
  /**
   * 节点value(ID)
   */
  value: PropTypes.string.isRequired,
  /**
   * 节点显示的文本信息
   */
  text: PropTypes.string.isRequired,
  /**
   * 节点的提示信息
   */
  qtip: PropTypes.string,
  /**
   * 是否选中
   */
  selected: PropTypes.bool,
  /**
   * 是否选中checkbox（仅在commbox=true时有效）
   * 其中0为未选中，1为选中，2为半选中
   */
  checked: PropTypes.number,
  /**
   * 是否多选
   * @type {[type]}
   */
  multiple: PropTypes.bool,
  /**
   * 是否显示复选框（多选模式）
   */
  commbox: PropTypes.bool,
  /**
   * 是否展开
   */
  expanded: PropTypes.bool,
  /**
   * 是否设为disable，让它不可选
   */
  disabled: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func
  ]),
  /**
   * 是否为叶节点
   */
  leaf: PropTypes.bool,
  /**
   * 是否显示节点箭头
   */
  useArrow: PropTypes.bool,
  /**
   * 选取节点时的回调事件
   * @type {[function(isSelected, node)]}
   */
  onSelect: PropTypes.func,
  /**
   * 选取commbox时的回调事件
   * @type {[function(isChecked, node)]}
   */
  onCheck: PropTypes.func,
  /**
   * 展开或收缩节点时的回调事件
   * @type {[function(isExpanded, node)]}
   */
  onExpand: PropTypes.func,
  /**
   * 增加自定义的节点
   * @type {[function(node)]}
   */
  customerNode: PropTypes.shape({
    onAdd: PropTypes.func, // 添加函数
    hover: PropTypes.bool // 触发点
  }),
  // 增加 icon 自定义树形
  customerIcon: PropTypes.oneOfType([
    PropTypes.element,
    PropTypes.node
  ])
}

TreeNode.defaultProps = {
  customerIconClass: '',
  prefixCls: 'rt-tree-node',
  onSelect: noop,
  onCheck: noop,
  onExpand: noop
}

export default TreeNode;
