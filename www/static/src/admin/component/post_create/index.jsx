import React from 'react';
import moment from 'moment';
import {
  Form,
  Radio,
  RadioGroup,
  ValidatedInput
} from 'react-bootstrap-validation';
import classnames from 'classnames';
import Datetime from 'react-datetime';
import Select, {Option} from 'rc-select';
import Base from 'base';
import Editor from 'common/component/editor';

import BreadCrumb from 'admin/component/breadcrumb';
import PostAction from 'admin/action/post';
import PostStore from 'admin/store/post';
import CateAction from 'admin/action/cate';
import CateStore from 'admin/store/cate';
import TagAction from 'admin/action/tag';
import TagStore from 'admin/store/tag';
import TipAction from 'common/action/tip';
import firekylin from 'common/util/firekylin';
import PushStore from 'admin/store/push';
import PushAction from 'admin/action/push';
import OptionsAction from 'admin/action/options';
import OptionsStore from 'admin/store/options';

import 'react-datetime/css/react-datetime.css';
import 'rc-select/assets/index.css';
import './style.css';

module.exports = class extends Base {
  initialState() {
    return JSON.parse(JSON.stringify({
      postSubmitting: false,
      draftSubmitting: false,
      postInfo: {
        title: '',
        pathname: '',
        markdown_content: '',
        tag: [],
        cate: [],
        is_public: '1',
        create_time: '',
        allow_comment: true,
        options: {
          template: '',
          push_sites: []
        }
      },
      status: 3,
      cateList: [],
      tagList: [],
      push_sites: [],
      templateList: []
    }));
  }

  constructor(props) {
    super(props);
    this.state = this.initialState();

    this.type = 0;
    this.cate = {};
    this.id = this.props.params.id | 0;
  }

  componentWillMount() {
    this.listenTo(PostStore, this.handleTrigger.bind(this));
    this.listenTo(PushStore, this.pushHandleTrigger.bind(this));
    this.listenTo(CateStore, this.getCateList.bind(this));
    this.listenTo(TagStore, tagList => this.setState({tagList}));
    this.listenTo(OptionsStore, this.getDefaultCate.bind(this));

    CateAction.select();
    TagAction.select();
    PushAction.select();
    OptionsAction.defaultCategory();
    if(this.id) { PostAction.select(this.id); }
  }

  componentWillReceiveProps(nextProps) {
    this.id = nextProps.params.id | 0;
    if(this.id) {
      PostAction.select(this.id);
    }
    let {postInfo} = this.initialState();
    this.setState({postInfo});
  }

  /**
   * ???????????????????????????
   */
  isPost() {
    return !this.type;
  }

  /**
   * ???????????????????????????
   */
  isPage() {
    return this.type;
  }

  /**
   * ?????????????????????????????????
   */
  getThemeTemplateList(templateList) {
    this.setState({templateList});
  }

  /**
   * ????????????????????????
   */
  getDefaultCate(data) {
    let postInfo = this.state.postInfo;
    postInfo.cate.push({id: +data});
    this.setState({postInfo});
  }

  /**
   * ??????????????????????????????
   */
  getCateList(cateList) {
    let list = cateList.filter(cate => cate.pid === 0);
    for(let i=0, l=list.length; i<l; i++) {
      let child = cateList.filter(cate => cate.pid === list[i].id);
      if(child.length === 0) continue;
      list.splice.apply(list, [i+1, 0].concat(child));
    }
    this.setState({cateList: list});
  }

  pushHandleTrigger(data, type) {
    switch(type) {
      case 'getPushList':
        this.setState({push_sites: data});
        break;
    }
  }
  /**
   * hanle trigger
   * @param  {[type]} data [description]
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  handleTrigger(data, type) {
    switch(type) {
      case 'savePostFail':
        this.setState({draftSubmitting: false, postSubmitting: false});
        break;
      case 'savePostSuccess':
        TipAction.success(this.id ? '????????????' : '????????????');
        this.setState({draftSubmitting: false, postSubmitting: false});
        setTimeout(() => this.redirect('post/list'), 1000);
        break;
      case 'getPostInfo':
        if(data.create_time === '0000-00-00 00:00:00') {
          data.create_time = '';
        }
        data.create_time = data.create_time ?
          moment(new Date(data.create_time)).format('YYYY-MM-DD HH:mm:ss') :
          data.create_time;
        data.tag = data.tag.map(tag => tag.name);
        data.cate.forEach(item => this.cate[item.id] = true);
        if(!data.options) {
          data.options = {push_sites: []};
        } else if(typeof(data.options) === 'string') {
          data.options = JSON.parse(data.options);
        } else {
          data.options.push_sites = data.options.push_sites || [];
        }
        this.setState({postInfo: data});
        break;
    }
  }
  /**
   * save
   * @return {}       []
   */
  handleValidSubmit(values) {
    if(!this.state.status) {
      this.setState({draftSubmitting: true});
    } else {
      this.setState({postSubmitting: true});
    }

    if(this.id) {
      values.id = this.id;
    }

    /** ???????????????????????????????????????????????????????????????????????? **/
    values.create_time = this.state.postInfo.create_time;
    // if( this.state.status === 0 ) {
    //   values.create_time = '';
    // } else {
    //   values.create_time = this.state.postInfo.create_time || moment().format('YYYY-MM-DD HH:mm:ss');
    // }

    values.status = this.state.status;
    values.markdown_content = this.state.postInfo.markdown_content;
    if(values.status === 3 && !values.markdown_content) {
      this.setState({draftSubmitting: false, postSubmitting: false});
      return TipAction.fail('??????????????????????????????');
    }

    values.type = this.type; //type: 0????????????1?????????
    values.allow_comment = Number(this.state.postInfo.allow_comment);
    values.push_sites = this.state.postInfo.push_sites;
    values.cate = Object.keys(this.cate).filter(item => this.cate[item]);
    values.tag = this.state.postInfo.tag;

    let push_sites = this.state.push_sites.map(({appKey}) => appKey);
    this.state.postInfo.options.push_sites =
      this.state.postInfo.options.push_sites.filter(appKey => push_sites.includes(appKey));
    values.options = JSON.stringify(this.state.postInfo.options);
    PostAction.save(values);
  }

  /**
   * https://github.com/lepture/editor/blob/master/src/intro.js#L327-L341
   * The right word count in respect for CJK.
   */
  wordCount(data) {
    var pattern = /[a-zA-Z0-9_\u0392-\u03c9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
    var m = data.match(pattern);
    var count = 0;
    if(m === null) return count;
    for (var i = 0; i < m.length; i++) {
      if (m[i].charCodeAt(0) >= 0x4E00) {
        count += m[i].length;
      } else {
        count += 1;
      }
    }
    return count;
  }

  /**
   * ????????????????????????
   */
  renderTitle(postInfo = this.state.postInfo) {
    let props = {
      value: postInfo.title,
      label: `${this.id ? '??????' : '??????'}${this.isPage() ? '??????' : '??????'}`,
      onChange:(e)=>{
        postInfo.title = e.target.value;
        this.setState({postInfo});
      }
    };

    return (
      <ValidatedInput
          name="title"
          type="text"
          placeholder="??????"
          validate="required"
          {...props}
      />
    );
  }

  /**
   * ?????? pathname ?????????????????????????????????????????????????????????
   */
  renderPathname(postInfo = this.state.postInfo) {
    let props = {
      disabled: postInfo.status === 3,
      value: postInfo.pathname,
      onChange:(e)=>{
        postInfo.pathname = e.target.value;
        this.setState({postInfo});
      }
    };
    //baseUrl
    let baseUrl = location.origin + '/' + ['post', 'page'][this.type] + '/';

    return (
      <div className="pathname">
        <span>{baseUrl}</span>
        <ValidatedInput name="pathname" type="text" validate="required" {...props} />
        <span>.html</span>
      </div>
    );
  }

  /**
   * ???????????????
   */
  renderEditor(postInfo = this.state.postInfo) {
    return (
      <div className="form-group">
        <Editor
          content={postInfo.markdown_content}
          onChange={content => {
            postInfo.markdown_content = content;
            this.setState({postInfo});
          }}
          onFullScreen={isFullScreen => this.setState({isFullScreen})}
          info = {{id: this.id, type: this.type}}
        />
        <p style={{lineHeight: '30px'}}>
          <span className="pull-left">
            ???????????? markdown ???????????????????????????
            <a href="https://guides.github.com/features/mastering-markdown/" target="_blank">
              ??????
            </a>
          </span>
          <span className="pull-right">
            ?????????{this.wordCount(this.state.postInfo.markdown_content)}
          </span>
        </p>
      </div>
    );
  }

  /**
   * ?????????????????????????????????????????????????????????????????????
   */
  renderPushList(postInfo = this.state.postInfo) {
    if(window.SysConfig.userInfo.type !== 1) { return null; }
    if(this.state.push_sites.length === 0) { return null; }

    let push_sites = postInfo.options.push_sites || [];
    let list = this.state.push_sites.map((site, i) => {
      let checked = push_sites.includes(site.appKey);
      let props = {
        checked,
        value: site.appKey,
        onChange() {
          let new_push_sites = postInfo.options.push_sites;
          if(checked) {
            new_push_sites = push_sites.filter(appKey => appKey !== site.appKey);
          } else {
            new_push_sites.push(site.appKey);
          }
          postInfo.options.push_sites = new_push_sites;
          this.setState({postInfo});
        }
      };

      return (
        <li key={i}>
          <label>
            <input type="checkbox" name="push_sites" {...props} />
            <span style={{fontWeight: 'normal'}}>{site.title}</span>
          </label>
        </li>
      );
    });

    return (
      <div className="form-group">
        <label className="control-label">????????????</label>
        <ul>{list}</ul>
      </div>
    );
  }

  /**
   * ??????????????????
   */
  renderAllowComment(postInfo = this.state.postInfo) {
    return (
      <div className="form-group">
        <label className="control-label">????????????</label>
        <div>
          <label>
            <input
                type="checkbox"
                name="allow_comment"
                checked={postInfo.allow_comment}
                onChange={()=> {
                  postInfo.allow_comment = !postInfo.allow_comment;
                  this.setState({postInfo});
                }}
            />
            ????????????
          </label>
        </div>
      </div>
    );
  }

  /**
   * ?????????????????????
   */
  renderPublicRadio() {
    return (
      <RadioGroup
        name="is_public"
        label="?????????"
        wrapperClassName="col-xs-12 is-public-radiogroup"
      >
        <Radio value="1" label="??????" />
        <Radio value="0" label="?????????" />
      </RadioGroup>
    );
  }

  /**
   * ???????????????????????????????????????????????????
   */
  renderTag(postInfo = this.state.postInfo) {
    if(this.isPage()) { return null; }

    return (
      <div className="form-group">
        <label className="control-label">??????</label>
        <div>
          <Select
              tags
              style={{width: '100%'}}
              maxTagTextLength={5}
              value={postInfo.tag}
              onChange={val => {
                postInfo.tag = val;
                this.setState({postInfo});
              }}
          >
              {this.state.tagList.map(tag =>
                <Option key={tag.name} value={tag.name}>{tag.name}</Option>
              )}
          </Select>
        </div>
      </div>
    );
  }

  /**
   * ???????????????????????????????????????????????????
   * ?????????????????????????????????
   */
  renderCategory(postInfo = this.state.postInfo) {
    if(this.isPage()) { return null; }

    let cateInitial = [];
    if(Array.isArray(this.state.postInfo.cate)) {
      cateInitial = postInfo.cate.map(item => item.id);
    }

    return (
      <div className="form-group">
        <label className="control-label">??????</label>
        <ul>
          {this.state.cateList.map(cate =>
            <li key={cate.id}>
              {cate.pid !== 0 ? '???' : null}
              <label>
                <input
                    type="checkbox"
                    name="cate"
                    value={cate.id}
                    checked={cateInitial.includes(cate.id)}
                    onChange={()=>{
                      this.cate[cate.id] = !this.cate[cate.id];
                      postInfo.cate = this.state.cateList.filter(cate => this.cate[cate.id]);
                      this.setState({postInfo});
                    }}
                />
                <span style={{fontWeight: 'normal'}}>{cate.name}</span>
              </label>
            </li>
          )}
        </ul>
      </div>
    );
  }

  /**
   * ?????????????????????????????????????????????????????????
   */
  renderPageTemplateSelect(postInfo = this.state.postInfo) {
    if(this.isPost()) { return null; }

    let template = postInfo.options.template || '';
    let templateList = this.state.templateList.map(t => ({id: t, name: t}));
    templateList = [{id: '', name: '?????????'}].concat(templateList);

    return (
      <div style={{marginBottom: 15}}>
        <label>???????????????</label>
        <div>
          <Select
              optionLabelProp="label"
              showSearch={false}
              style={{width: '100%'}}
              value={template}
              onChange={val => {
                postInfo.options.template = val;
                this.setState({postInfo});
              }}
          >

            {templateList.map(({id, name}) =>
              <Option key={name} value={id} label={name}>{name}</Option>
            )}
          </Select>
        </div>
      </div>
    )
  }

  /**
   * ??????????????????
   */
  renderDatetime(postInfo = this.state.postInfo) {
    return (
      <div style={{marginBottom: 15}}>
        <label>????????????</label>
        <div>
          <Datetime
            dateFormat="YYYY-MM-DD"
            timeFormat="HH:mm:ss"
            locale="zh-cn"
            value={postInfo.create_time}
            onChange={val => {
              postInfo.create_time = val;
              this.setState({postInfo});
            }}
          />
        </div>
      </div>
    );
  }

  /**
   * ??????????????????????????????????????????????????????
   */
  renderPostButton(props = {}) {
    let draftOnClick = () => {
      this.state.status = 0;
      localStorage.removeItem('unsavetype'+this.type+'id'+this.id);

      // ???????????????
      this.refs.form.submit();
    };

    let publishOnClick = () => {
      this.state.status = 3;
      localStorage.removeItem('unsavetype'+this.type+'id'+this.id);
    }

    return (
      <div className="button-group">
        <button
          type="button"
          {...props}
          className="btn btn-default"
          onClick={draftOnClick}
        >{this.state.draftSubmitting ? '?????????...' : '????????????'}</button>
        <span> </span>
        <button
            type="submit"
            {...props}
            className="btn btn-primary"
            onClick={publishOnClick}
        >{this.state.postSubmitting ? '?????????...' : `??????${this.isPage() ? '??????' : '??????'}`}</button>
      </div>
    );
  }

  /**
   * render
   * @return {} []
   */
  render() {
    let props = {}
    if(this.state.draftSubmitting || this.state.postSubmitting) {
      props.disabled = true;
    }

    //??????????????????????????????????????????????????????????????????
    //?????? react-bootstrap-validation ????????? render ??????????????? defaultValue ????????????
    if(this.id && !this.state.postInfo.pathname && this.state.postInfo.status !== 0) {
      return null;
    }

    //?????? RadioGroup ???????????????????????????????????????????????????
    if(firekylin.isNumber(this.state.postInfo.is_public)) {
      this.state.postInfo.is_public += '';
    }

    return (
      <div className="fk-content-wrap">
        <BreadCrumb {...this.props} />
        <div className="manage-container">
          <Form
            ref='form'
            model={this.state.postInfo}
            className="post-create clearfix"
            onValidSubmit={this.handleValidSubmit.bind(this)}
          >
            <div className="row">
              <div className={classnames({'col-xs-9': !this.state.isFullScreen})}>
                {this.renderTitle()}
                {this.renderPathname()}
                {this.renderEditor()}
              </div>
              <div className={classnames('col-xs-3')}>
                {this.renderPostButton(props)}
                {this.renderDatetime()}
                {this.renderPageTemplateSelect()}
                {this.renderCategory()}
                {this.renderTag()}
                {this.renderPublicRadio()}
                {this.renderAllowComment()}
                {this.renderPushList()}
              </div>
            </div>
          </Form>
        </div>
      </div>
    );
  }
}
