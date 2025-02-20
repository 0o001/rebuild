/*!
Copyright (c) REBUILD <https://getrebuild.com/> and/or its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/

const wpc = window.__PageConfig
var contentComp = null
var whenUpdateFields

$(document).ready(() => {
  $.fn.select2.defaults.set('allowClear', false)

  for (let i = 0; i < 24; i++) {
    const H1 = i < 10 ? `0${i}` : i
    const H2 = i + 1 < 10 ? `0${i + 1}` : i + 1
    $(`<option value="${i}">${H1}:00</option>`).appendTo('.J_startHour1')
    $(`<option value="${i}">${H2}:00</option>`).appendTo('.J_startHour2')
  }
  $('.J_startHour1').val('0')
  $('.J_startHour2').val('23')

  if (wpc.when > 0) {
    $([1, 2, 4, 16, 32, 64, 128, 256, 512, 1024, 2048]).each(function () {
      let mask = this
      if ((wpc.when & mask) !== 0) {
        $(`.J_when input[value=${mask}]`).prop('checked', true)

        if (mask === 512) {
          $('.on-timers').removeClass('hide')
          const wt = (wpc.whenTimer || 'D:1').split(':')
          $('.J_whenTimer1').val(wt[0])
          $('.J_whenTimer2').val(wt[1])
          // v2.9
          if (wt[2]) $('.J_startHour1').val(wt[2])
          if (wt[3]) $('.J_startHour2').val(wt[3])

          $('.J_whenTimer1').trigger('change')
        }
      }
    })
  }

  let advFilter
  $('.J_whenFilter .btn').on('click', () => {
    if (advFilter) {
      advFilter.show()
    } else {
      renderRbcomp(<AdvFilter entity={wpc.sourceEntity} filter={wpc.whenFilter} confirm={saveFilter} title={$L('附加过滤条件')} inModal canNoFilters />, null, function () {
        advFilter = this
      })
    }
  })
  saveFilter(wpc.whenFilter)

  $('.when-update a').on('click', (e) => {
    $stopEvent(e, true)
    renderRbcomp(
      <DlgSpecFields
        selected={whenUpdateFields}
        onConfirm={(s) => {
          whenUpdateFields = s
          const $s = $('.when-update .custom-control-label')
          if (s.length > 0) $s.text(`${$s.text().split(' (')[0]} (${s.length})`)
          else $s.text($s.text().split(' (')[0])
        }}
      />
    )
  })

  renderContentComp({ sourceEntity: wpc.sourceEntity, content: wpc.actionContent })

  const $btn = $('.J_save').on('click', () => {
    if (!contentComp) return

    let when = 0
    $('.J_when input:checked').each(function () {
      when += ~~$(this).val()
    })
    if (rb.commercial < 10 && ((when & 512) !== 0 || (when & 1024) !== 0 || (when & 2048) !== 0)) {
      RbHighbar.error(WrapHtml($L('免费版不支持审批提交时/审批驳回时/定时执行功能 [(查看详情)](https://getrebuild.com/docs/rbv-features)')))
      return
    }

    const whenTimer = `${$('.J_whenTimer1').val() || 'D'}:${$('.J_whenTimer2').val() || 1}:${$('.J_startHour1').val() || 0}:${$('.J_startHour2').val() || 23}`

    const content = contentComp.buildContent()
    if (content === false) return

    const data = {
      when: when,
      whenTimer: whenTimer,
      whenFilter: wpc.whenFilter || null,
      actionContent: content,
      metadata: {
        entity: 'RobotTriggerConfig',
        id: wpc.configId,
      },
    }
    const priority = $val('#priority')
    if (priority && !isNaN(priority)) data.priority = ~~priority

    $btn.button('loading')
    $.post('/app/entity/common-save', JSON.stringify(data), (res) => {
      if (res.error_code === 0) {
        const msg = (
          <RF>
            <strong>{$L('保存成功')}</strong>
            {when <= 0 && <p className="text-warning m-0 mt-1">{$L('由于未启用任何触发动作，此触发器不会被自动执行')}</p>}
          </RF>
        )
        RbAlert.create(msg, {
          icon: 'info-outline',
          cancelText: $L('返回列表'),
          cancel: () => location.replace('../triggers'),
          confirmText: $L('继续编辑'),
          confirm: () => location.reload(),
        })
      } else {
        RbHighbar.error(res.error_msg)
      }
      $btn.button('reset')
    })
  })

  if (wpc.lockedUser && wpc.lockedUser[0] !== rb.currentUser) {
    $('.footer .alert-warning').removeClass('hide').find('.message').text($L('已被 %s 锁定，其他人无法操作', wpc.lockedUser[1]))
    $('.footer .btn').attr('disabled', true)
  }

  if (LastLogsViewer.renderLog && rb.commercial > 1) {
    $.get(`/admin/robot/trigger/last-logs?id=${wpc.configId}`, (res) => {
      const _data = res.data || []
      if (_data.length > 0) {
        const last = _data[0]
        const $a = $(`<a href="#last-logs">${$fromNow(last[0])}</a>`).appendTo($('.J_last-logs .form-control-plaintext').empty())
        $a.on('click', (e) => {
          $stopEvent(e, true)
          renderRbcomp(<LastLogsViewer width="681" data={_data} />)
        })
      }
      $('.J_last-logs').removeClass('hide')
    })
  }
})

const saveFilter = function (res) {
  wpc.whenFilter = res
  if (wpc.whenFilter && wpc.whenFilter.items && wpc.whenFilter.items.length > 0) $('.J_whenFilter a').text(`${$L('已设置条件')} (${wpc.whenFilter.items.length})`)
  else $('.J_whenFilter a').text($L('点击设置'))
}

// 组件复写
var renderContentComp = function (props) {
  // eslint-disable-next-line no-console
  if (rb.env === 'dev') console.log(props)
}

// 执行日志查看
class LastLogsViewer extends RbAlert {
  renderContent() {
    return (
      <RF>
        <table className="table table-hover">
          <thead>
            <tr>
              <th>{$L('执行内容')}</th>
              <th width="150">{$L('执行时间')}</th>
            </tr>
          </thead>
          <tbody>
            {this.props.data.map((item, idx) => {
              return (
                <tr key={idx}>
                  <td>{this._renderLog(item[1])}</td>
                  <td>{item[0]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {this.props.data.length >= 100 && <p className="text-muted text-center">{$L('最多显示最近 100 次执行')}</p>}
      </RF>
    )
  }

  _renderLog(log) {
    if (!log) return <p className="m-0 text-warning">N</p>

    try {
      return LastLogsViewer.renderLog(JSON.parse(log))
    } catch (err) {
      console.debug(err)
      return (
        <p className="m-0 text-warning text-overflow" style={{ maxHeight: 295 }}>
          {(log || 'N').toUpperCase()}
        </p>
      )
    }
  }

  // 日志解析复写
  static renderLog(log) {
    if (log.level > 1) {
      return <p className={`m-0 ${log.level === 2 ? 'text-muted' : 'text-warning'}`}>{(log.message || 'N').toUpperCase()}</p>
    }

    return (
      <dl className="m-0">
        {log.affected && (
          <RF>
            <dt>{$L('影响记录')}</dt>
            <dd className="mb-0">
              {log.affected.map((a, idx) => {
                return (
                  <a key={idx} className="badge text-id" href={`${rb.baseUrl}/app/entity/view?id=${a}`} target="_blank">
                    {a}
                  </a>
                )
              })}
            </dd>
          </RF>
        )}
        {log.chain && (
          <RF>
            <dt
              className="mt-2 pointer font-weight-normal"
              onClick={(e) => {
                $(e.target).find('i.mdi').toggleClass('mdi-chevron-double-up')
                $(e.target).next().toggleClass('hide')
              }}>
              {$L('执行细节')}
              <i className="mdi mdi-chevron-double-down" />
            </dt>
            <dd className="mb-0 hide">
              <code>{log.chain}</code>
            </dd>
          </RF>
        )}
      </dl>
    )
  }
}

const BIZZ_ENTITIES = ['User', 'Department', 'Role', 'Team']

// 用户选择器
// eslint-disable-next-line no-unused-vars
class UserSelectorWithField extends UserSelector {
  constructor(props) {
    super(props)
    this._useTabs.push(['FIELDS', $L('使用字段')])
  }

  componentDidMount() {
    super.componentDidMount()

    this._fields = []
    $.get(`/commons/metadata/fields?deep=2&entity=${this.props.entity || wpc.sourceEntity}`, (res) => {
      $(res.data).each((idx, item) => {
        if ((item.type === 'REFERENCE' || item.type === 'N2NREFERENCE') && item.ref && BIZZ_ENTITIES.includes(item.ref[0])) {
          this._fields.push({ id: item.name, text: item.label })
        }
      })
    })
  }

  switchTab(type) {
    type = type || this.state.tabType
    if (type === 'FIELDS') {
      const q = this.state.query
      const ckey = type + '-' + q
      this.setState({ tabType: type, items: this._cached[ckey] }, () => {
        if (!this._cached[ckey]) {
          if (!q) {
            this._cached[ckey] = this._fields
          } else {
            const fs = []
            $(this._fields).each(function () {
              if (this.text.contains(q)) fs.push(this)
            })
            this._cached[ckey] = fs
          }
          this.switchTab(type)
        }
      })
    } else {
      super.switchTab(type)
    }
  }
}

// 动作类定义
// eslint-disable-next-line no-unused-vars
class ActionContentSpec extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  // 子类复写返回操作内容
  buildContent() {
    return false
  }
}

// eslint-disable-next-line no-unused-vars
function _handle512Change() {
  if ($(event.target).prop('checked')) $('.on-timers').removeClass('hide')
  else $('.on-timers').addClass('hide')
}

// 立即执行
// eslint-disable-next-line no-unused-vars
function useExecManual() {
  $('.footer .btn-light').removeClass('hide')
  $(`<a class="dropdown-item">${$L('立即执行')} <sup class="rbv"></sup></a>`)
    .appendTo('.footer .dropdown-menu')
    .on('click', () => {
      if (rb.commercial < 10) {
        RbHighbar.error(WrapHtml($L('免费版不支持立即执行功能 [(查看详情)](https://getrebuild.com/docs/rbv-features)')))
        return
      }

      RbAlert.create($L('此操作将直接执行此触发器，数据过多耗时会较长，请耐心等待。是否继续？'), {
        onConfirm: function () {
          this.disabled(true, true)
          $mp.start()

          $.post(`/admin/robot/trigger/exec-manual?id=${wpc.configId}`, (res) => {
            useExecManual_checkState(res.data, this)
          })
        },
      })
    })
}
// 检查状态
function useExecManual_checkState(taskid, _alert) {
  $.get('/commons/task/state?taskid=' + taskid, (res) => {
    if ((res.data || {}).isCompleted) {
      _alert && _alert.hide(true)
      $mp.end()
      RbHighbar.success($L('执行成功'))
    } else {
      setTimeout(() => useExecManual_checkState(taskid, _alert), 1000)
    }
  })
}

// ~ 指定字段
class DlgSpecFields extends RbModalHandler {
  render() {
    const _selected = this.props.selected || []

    return (
      <RbModal title={$L('指定字段')} ref={(c) => (this._dlg = c)} disposeOnHide>
        <div className="p-1">
          <div className="alert alert-warning alert-icon alert-icon-border alert-dismissible alert-sm">
            <div className="icon">
              <span className="zmdi zmdi-info-outline" />
            </div>
            <div className="message">
              <a className="close" data-dismiss="alert">
                <span className="zmdi zmdi-close" />
              </a>
              <p>{$L('指定字段被更新时触发，默认为全部字段')}</p>
            </div>
          </div>

          <div className="row " ref={(c) => (this._fields = c)}>
            {(this.state.fields || []).map((item) => {
              if (item.type === 'BARCODE' || item.updatable === false) return null
              return (
                <div className="col-3" key={`field-${item.name}`}>
                  <label className="custom-control custom-control-sm custom-checkbox custom-control-inline mb-1">
                    <input className="custom-control-input" type="checkbox" value={item.name} defaultChecked={_selected.includes(item.name)} />
                    <span className="custom-control-label">{item.label}</span>
                  </label>
                </div>
              )
            })}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn btn-primary btn-space" type="button" onClick={this.handleConfirm}>
            {$L('确定')}
          </button>
          <button className="btn btn-secondary btn-space" type="button" onClick={this.hide}>
            {$L('取消')}
          </button>
        </div>
      </RbModal>
    )
  }

  handleConfirm = () => {
    const selected = []
    $(this._fields)
      .find('input:checked')
      .each(function () {
        selected.push(this.value)
      })

    typeof this.props.onConfirm === 'function' && this.props.onConfirm(selected)
    this.hide()
  }

  componentDidMount() {
    $.get(`/commons/metadata/fields?entity=${wpc.sourceEntity}`, (res) => this.setState({ fields: res.data }))
  }

  static render(content) {
    if (content.whenUpdateFields && content.whenUpdateFields.length > 0) {
      window.whenUpdateFields = content.whenUpdateFields
      const $s = $('.when-update .custom-control-label')
      $s.text(`${$s.text()} (${content.whenUpdateFields.length})`)
    }
  }
}

// eslint-disable-next-line no-unused-vars
function disableWhen() {
  const args = arguments
  $('.J_when')
    .find('.custom-control-input')
    .each(function () {
      const when = ~~$(this).val()
      for (let i = 0; i < args.length; i++) {
        if (args[i] === when) {
          $(this).attr('disabled', true)
          break
        }
      }
    })
}

// eslint-disable-next-line no-unused-vars
class EditorWithFieldVars extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  render() {
    let attrs = {
      className: 'form-control',
      maxLength: 2000,
      placeholder: this.props.placeholder || null,
    }

    if (this.props.isCode) {
      attrs = { ...attrs, className: 'formula-code', maxLength: 6000, autoFocus: true }
    }

    return (
      <div className="textarea-wrap">
        <textarea {...attrs} ref={(c) => (this._$content = c)} />
        <a className="fields-vars" title={$L('插入字段变量')} data-toggle="dropdown">
          <i className="mdi mdi-code-braces" />
        </a>
        <div className="dropdown-menu auto-scroller dropdown-menu-right" ref={(c) => (this._$fieldVars = c)}>
          {(this.state.fieldVars || []).map((item) => {
            return (
              <a
                className="dropdown-item"
                key={item.name}
                onClick={() => {
                  $(this._$content).insertAtCursor(`{${item.name}}`)
                }}>
                {item.label}
              </a>
            )
          })}
        </div>
      </div>
    )
  }

  componentDidMount() {
    $.get(`/commons/metadata/fields?entity=${this.props.entity}&deep=2`, (res) => {
      this.setState({ fieldVars: res.data || [] }, () => {
        $(this._$fieldVars).perfectScrollbar({})
      })
    })

    // eslint-disable-next-line no-undef
    autosize(this._$content)
  }

  val() {
    if (arguments.length > 0) {
      $(this._$content).val(arguments[0])
      // eslint-disable-next-line no-undef
      autosize.update(this._$content)
    } else {
      return $(this._$content).val()
    }
  }
}
