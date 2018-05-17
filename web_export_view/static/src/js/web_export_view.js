odoo.define('web_export_view', function (require) {
"use strict";

    var core = require('web.core');
    var Sidebar = require('web.Sidebar');
    var session = require('web.session');

    var QWeb = core.qweb;

    var _t = core._t;

    Sidebar.include({

        _redraw: function () {
            var self = this;
            this._super.apply(this, arguments);
            if (self.getParent().renderer.viewType === 'list') {
                self.$el.find('.o_dropdown').last().append(QWeb.render('WebExportTreeViewXls', {widget: self}));
                self.$el.find('.export_treeview_xls').on('click', self.on_sidebar_export_treeview_xls);
            }
        },

        on_sidebar_export_treeview_xls: function () {
            // Select the first list of the current (form) view
            // or assume the main view is a list view and use that
            var self = this,
                view = this.getParent(),
                children = view.getChildren();
            if (children) {
                children.every(function (child) {
                    if (child.field && child.field.type === 'one2many') {
                        view = child.viewmanager.views.list.controller;
                        return false; // break out of the loop
                    }
                    if (child.field && child.field.type === 'many2many') {
                        view = child.list_view;
                        return false; // break out of the loop
                    }
                    return true;
                });
            }
            var export_columns_keys = [];
            var export_columns_names = [];
            var column_index = 0;
            $.each(view.renderer.columns, function () {
                if (this.tag === 'field' && (this.attrs.widget === undefined || this.attrs.widget !== 'handle')) {
                    // non-fields like `_group` or buttons
                    export_columns_keys.push(column_index);
                    export_columns_names.push(view.$el.find('.o_list_view > thead > tr> th[title]:eq('+column_index+')')[0].textContent);
                }
                column_index ++;
            });
            var export_rows = [];
            $.blockUI();
            if (children) {
                // find only rows with data
                view.$el.find('.o_list_view > tbody > tr.o_data_row:has(.o_list_record_selector input:checkbox:checked)')
                .each(function () {
                    var $row = $(this);
                    var export_row = [];
                    $.each(export_columns_keys, function () {
                        var $cell = $row.find('td.o_data_cell:eq('+this+')')
                        var $cellcheckbox = $cell.find('.o_checkbox input:checkbox');
                        if ($cellcheckbox.length) {
                            export_row.push(
                                $cellcheckbox.is(":checked")
                                ? _t("True") : _t("False")
                            );
                        }
                        else {
                            var text = $cell.text().trim();
                            if ($cell.hasClass("o_list_number")) {
                                export_row.push(parseFloat(
                                    text
                                    // Remove thousands separator
                                    .split(_t.database.parameters.thousands_sep)
                                    .join("")
                                    // Always use a `.` as decimal separator
                                    .replace(_t.database.parameters.decimal_point, ".")
                                    // Remove non-numeric characters
                                    .replace(/[^\d\.-]/g, "")
                                ));
                            }
                            else {
                                export_row.push(text);
                            }
                        }
                    });
                    export_rows.push(export_row);
                });
            }
            session.get_file({
                url: '/web/export/xls_view',
                data: {data: JSON.stringify({
                    model: view.modelName,
                    headers: export_columns_names,
                    rows: export_rows
                })},
                complete: $.unblockUI
            });
        }

    });
});
