/*
Copyright 2018 DEVEZHAO(zhaofang123@gmail.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package cn.devezhao.rebuild.web.entity.datalist;

import com.alibaba.fastjson.JSONObject;

import cn.devezhao.persist4j.Entity;
import cn.devezhao.persist4j.Field;
import cn.devezhao.persist4j.Query;
import cn.devezhao.persist4j.dialect.FieldType;
import cn.devezhao.persist4j.engine.ID;
import cn.devezhao.persist4j.query.compiler.SelectItem;
import cn.devezhao.rebuild.server.Application;
import cn.devezhao.rebuild.server.metadata.EntityHelper;

/**
 * 数据列表控制器
 * 
 * @author Zhao Fangfang
 * @version $Id: DefaultGridDataControl.java 1236 2015-03-20 07:58:33Z zhaoff@qidapp.com $
 * @since 1.0, 2013-6-20
 */
public class DefaultDataListControl implements DataListControl {

	protected JsonQueryParser queryParser;

	/**
	 */
	protected DefaultDataListControl() {
	}
	
	/**
	 * @param queryElement
	 */
	public DefaultDataListControl(JSONObject queryElement) {
		this.queryParser = new JsonQueryParser(queryElement, this);
	}

	/**
	 * @return
	 */
	public JsonQueryParser getQueryParser() {
		return queryParser;
	}

	@Override
	public String getDefaultFilter() {
		return null;
	}
	
	@Override
	public String getResult() {
		int timeout = 10 * 1000;
		int total = 0;
		if (queryParser.isNeedReload()) {
			String countSql = queryParser.toSqlCount();
			total = ((Long) Application.createQuery(countSql).unique()[0]).intValue();
		}
		
		Query query = Application.createQuery(queryParser.toSql()).setTimeout(timeout);
		int[] limit = queryParser.getSqlLimit();
		Object[][] array = query.setLimit(limit[0], limit[1]).array();

		// 补充引用字段的 NameField
		Field[] fields = queryParser.getFieldList();
		for (int i = 0; i < fields.length; i++) {
			Field field = fields[i];
			if (field.getType() == FieldType.REFERENCE) {
				for (Object o[] : array) {
					o[i] = readReferenceNamed(o[i]);
				}
			}
		}
		
		DataWrapper wrapper = getDataWrapper(total, array, query.getSelectItems());
		return wrapper.toJson();
	}

	/**
	 * @param total
	 * @param data
	 * @param fields
	 * @return
	 */
	protected DataWrapper getDataWrapper(int total, Object[][] data, SelectItem[] fields) {
		return new DataWrapper(total, data, fields);
	}
	
	/**
	 * @param idVal
	 * @return
	 */
	protected Object[] readReferenceNamed(Object idVal) {
		if (idVal == null) {
			return null;
		}
		
		ID id = (ID) idVal;
		Entity entity = EntityHelper.getEntity(id.getEntityCode());
		String sql = String.format("select %s from %s where %s = ?",
				entity.getNameField().getName(), entity.getName(), entity.getPrimaryField().getName());
		Object[] named = Application.createQuery(sql).setParameter(1, id).unique();
		return new Object[] { id, named == null ? "" : named[0] };
	}
}
