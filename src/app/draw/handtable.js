'use strict';
/*
 * Licensed under the Apache License, Version 2.0 Copyright 2017 Igor Strykhar,SMI2 LLC and other contributors
 */

class HandsTable {

    constructor(isDark,metaData,Preset) {
        this.isDarkTheme = isDark;
        this.meta = metaData;
        this.Preset=Preset;

    }

    _handsRenderer(instance, td, row, col, prop, value, cellProperties) {

        // if (cellProperties.type)
        if (cellProperties.type == 'numeric') {
            if (value==null || value=='-nan' || value=='inf' || value=='+nan' || value=='+inf'|| value=='-inf' || value=='nan') {
                // SELECT  inf, nan
                if (value==null)
                {
                    arguments[5] = "NULL";// так работает ;)
                }
                td.style.color='black';
                td.style.background='red';
                Handsontable.renderers.TextRenderer.apply(this, arguments);
            }

            else {


                // нормальный рендер числа
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
            }


        }
        else {
            if (cellProperties.type == 'date' || cellProperties.type == 'time') {
                // кастомный рендер на поле даты/вреря/датавремя
                if (moment(new Date(value)).isValid()) {
                    if (cellProperties.renderDateFormat) {
                        value = moment(value).format(cellProperties.renderDateFormat);
                    }
                }

                arguments[5] = value;// так работает ;)


                Handsontable.renderers.TextRenderer.apply(this, arguments);
            }
            else {

                Handsontable.renderers.TextRenderer.apply(this, arguments);
            }
        }

        // backgroundColor для ячейки
        if (cellProperties.backgroundColor) {
            td.style.backgroundColor = cellProperties.backgroundColor;
        }

        if (cellProperties.color) {
            td.style.color = cellProperties.color;
        }
    };

    static isDark() {
        return window.isDarkTheme;

    }

    countColumns() {
        return this.meta.length;
    }
    makeColumns() {

        const humanSortCols=this.Preset.humanSortCols;
        let colHeaders = [];
        let columns = [];
        let positions = {};
        let cnt = 0;
        this.meta.forEach((cell) => {


            positions[cell.name] = cnt;
            cnt++;

            colHeaders.push(cell.name);
            let c = {};
            c.type = 'text';
            c.width = 100;
            c.typeOriginal = cell.type;
            c.isDark = this.isDarkTheme;

            //UInt8, UInt16, UInt32, UInt64, Int8, Int16, Int32, Int64
            if (cell.type.includes('Int64')) {
                // Default string type
                c.type = 'text';
                c.width = 100;
                // if DataProvider.prepareInt64() convert String->Int64, use numeric type
                if (_.isObject(this.meta.prepareInt64Cols)) {
                    if (this.meta.prepareInt64Cols[cell.name])
                        c.type='numeric';
                  }

            } else  if (cell.type.includes('Int')) {
                c.width = 80;
                c.type = 'numeric';
            }
            // other type
            switch (cell.type) {
                case 'Date':
                    c.width = 90;
                    c.type = 'date';
                    c.dateFormat = 'YYYY-MM-DD';
                    break;
                case 'DateTime':
                    c.width = 150;
                    c.type = 'time';
                    c.timeFormat = 'YYYY-MM-DD HH:mm:ss';
                    break;
                case 'Float32':
                    c.width = 80;
                    c.type = 'numeric';
                    c.format = "0.[0000000]";
                    break;
                case 'Float64':
                    c.width = 80;
                    c.type = 'numeric';
                    c.format = "0.[0000000]";
                    break;
                case 'String':
                    c.width = 180;
                    break;
            }
            c.renderer = this._handsRenderer;
            c.data = cell.name;



            if (_.isArray(humanSortCols) && _.indexOf(humanSortCols,cell.name)>-1)
            {
                c.sortFunction=function (sortOrder) {
                // Handsontable's object iteration helper
                let objectEach = Handsontable.helper.objectEach;
                let unitsRatios = {
                    'TiB': 1024*1024*1024*1024,
                    'GiB': 1024*1024*1024,
                    'MiB': 1024*1024,
                    'KiB': 1024,
                    'B': 1,
                };
                let parseUnit = function(value, unit, ratio) {
                    if (_.isUndefined(value)) return value;
                    if (isNaN(value) && value.indexOf(' ' + unit) > -1) {
                        value = parseFloat(value.replace(unit, '')) * ratio;
                    }
                    return value;
                };



                return function(a, b) {
                    let newA = a[1];
                    let newB = b[1];
                    // console.log(">",a,b);
                    objectEach(unitsRatios, function(val, prop) {
                        newA = parseUnit(newA, prop, val);
                        newB = parseUnit(newB, prop, val);
                    });

                    if (newA < newB) {
                        return sortOrder ? -1 : 1;
                    }
                    if (newA > newB) {
                        return sortOrder ? 1 : -1;
                    }
                    return 0;
                };

            }
            }



            columns.push(c);
        });

        return {
            colHeaders: colHeaders,
            columns: columns,
            colPositions: positions
        };
    };

    static makeHeatmaps(ht, format) {

        // format = Heatmaps | NegaPosi
        // Heatmap для выбранных колонок,

        let selection = ht.getSelectedRange();
        let fromCol = Math.min(selection.from.col, selection.to.col);
        let toCol = Math.max(selection.from.col, selection.to.col);

        let h1 = "#a900e5";
        let h2 = "#3668ff";

        let heatmapScale = chroma.scale([h1, h2]);

        for (let col = fromCol; col <= toCol; col++) {

            let allRows = ht.countRows();
            let values = ht.getDataAtCol(col);
            let min = Math.min.apply(null, values);
            let max = Math.max.apply(null, values);

            if (min !== null && max !== null) {
                for (let row = 0; row <= allRows; row++) {
                    let value = parseFloat(ht.getDataAtCell(row, col));


                    if (format == 'Heatmaps') {
                        let point = (value - min) / (max - min);
                        let color = heatmapScale(point).hex();
                        let meta = ht.getCellMeta(row, col);
                        if (meta) {
                            // пробрасыавем в ренден _handsRenderer параметр backgroundColor
                            ht.setCellMeta(row, col, 'backgroundColor', color);
                        }
                    }

                    if (format == 'NegaPosi') {

                        let color = false;
                        if (value < 0) {
                            color = "#e27137";
                        }
                        if (value > 0) {
                            color = "#31b3e5";
                        }

                        let meta = ht.getCellMeta(row, col);
                        if (meta && color) {
                            // пробрасыавем в ренден _handsRenderer параметр color
                            ht.setCellMeta(row, col, 'color', color);
                        }
                    }

                }
            }
            else {
                console.warn("Can`t find Min&Max in column", col);
            }
        }
        ht.render();
    }

    static getSelected(ht,autoFullSelect,needFullTable) {
        // отдельный метод - выделение если оно пустое - выделять всю таблицу
        let selection = ht.getSelectedRange();
        let isSelection=false;
        if ((!selection && autoFullSelect) || needFullTable)
        {
            // тут получаем число строк + число колонок
            return {
                isSelection:false,
                fromRow:0,
                toRow:ht.countRows(),
                toCol:ht.countCols(),
                fromCol:0,
            }
        }
        if (!selection)
        {
            return {
                isSelection:false,
                fromRow:-1,
                toRow:-1,
                toCol:-1,
                fromCol:-1,
            }
        }

        let fromCol = Math.min(selection.from.col, selection.to.col);
        let toCol = Math.max(selection.from.col, selection.to.col);
        let fromRow = Math.min(selection.from.row, selection.to.row);
        let toRow = Math.max(selection.from.row, selection.to.row);

        return {
            isSelection:isSelection,
            fromRow:fromRow,
            toRow:toRow,
            toCol:toCol,
            fromCol:fromCol,

        }
    }

    static makeFormat(ht, makeFormat) {

        let selection = HandsTable.getSelected(ht,true);


        let columns = ht.getSettings().columns;
        for (let col = selection.fromCol; col <= selection.toCol; col++) {
            console.log("makeFormat for coll =" + col, makeFormat);

            switch (makeFormat) {
                case 'Reset':
                    columns[col].format = false;
                    columns[col].renderDateFormat = false;
                    break;
                case 'Money':
                    columns[col].format = '$0,0.00';
                    break;
                case 'Human':
                    columns[col].format = '5a';
                    break;
                case 'Bytes':
                    columns[col].format = '0.0b';
                    break;
                case 'Percentages':
                    columns[col].format = '(0.00 %)';
                    break;
                case 'Time':
                    columns[col].renderDateFormat = 'HH:mm:ss';
                    break;
                case 'Date':
                    columns[col].renderDateFormat = 'YYYY-MM-DD';
                    break;
                case 'DateTime':
                    columns[col].renderDateFormat = 'YYYY-MM-DD HH:mm:ss';
                    break;
                case 'DateLoc':
                    columns[col].renderDateFormat = 'LLLL';
                    break;
                case 'Float':
                    columns[col].format = '0.[0000000]';
                    break;
            }
        }
        ht.updateSettings({
            columns: columns
        });
        ht.render();
    }

    static isFormatColl(ht, needFormat) {

        needFormat = needFormat.toLowerCase();
        let selection = ht.getSelectedRange();
        let fromCol = Math.min(selection.from.col, selection.to.col);
        let toCol = Math.max(selection.from.col, selection.to.col);
        let columns = ht.getSettings().columns;
        for (let col = fromCol; col <= toCol; col++) {
            if (!columns[col].type.toLowerCase().includes(needFormat)) return false;
        }
        return true;
    }

    static pushToClipboardText(outText) {
        let textarea = document.createElement('textarea');
        textarea.style.width = 0;
        textarea.style.height = 0;
        textarea.style.border = 0;
        textarea.style.position = 'absolute';
        textarea.style.top = 0;
        document.body.append(textarea);
        textarea.value = outText;
        textarea.focus();
        textarea.select();
        try {
            var successful = document.execCommand('copy');
        } catch (err) {
            console.log('Oops, unable to copy');
        }
        document.body.removeChild(textarea);
    }

    static makeCreateTable(ht) {
        // @todo : вынести в отдельный метод - выделение если оно пустое - выделять всю таблицу
        let s = HandsTable.getSelected(ht, true);

        let outText = [];
        let q = "\n" + 'CREATE TABLE x (' + "\n";
        let keys = [];
        //


        let columns = ht.getSettings().columns;

        for (let col = s.fromCol; col <= s.toCol; col++) {

            let typeColumn = columns[col].typeOriginal;

            keys.push("\t" + ht.colToProp(col) + " " + typeColumn);


        }

        q = q + keys.join(",\n") + "\n)\nENGINE = TinyLog\n;;\n";


        console.log(q);
        HandsTable.pushToClipboardText(q);


    }

    static Calc(ht,command) {

        let s = HandsTable.getSelected(ht,true);

        let outText = [];
        let columns = ht.getSettings().columns;
        let rr = [];
        for (let col = s.fromCol; col <= s.toCol; col++) {

            for (let row = s.fromRow; row <= s.toRow; row++) {
                let typeColumn = columns[col].type.toLowerCase();
                if (typeColumn.includes('numeric')) {
                    rr.push(ht.getDataAtCell(row, col));
                }
            }
        }
        if (_.isArray(rr) && rr.length)
        {
            let val={
                median:_.round(_.median(rr),3),
                sum:_.round(_.sum(rr),3),
                average:_.round(_.average(rr),3),
                std:_.round(_.stdDeviation(rr),3)
            };
            angular.element(document).scope().$emit('handleBroadcastCalcSumCells', val);

        }
    }

    static Transpose(ht,command) {
        let d=HandsTable.transpose(ht.getSourceData());
        let colHeaders=[];
        let columns=[];
        for (let col of d.columns) {
            let c={};
            c.renderer = this._handsRenderer;
            c.data = col;
            c.type = 'text';
            c.width = 100;
            columns.push(c);
            colHeaders.push(col);

        }
        ht.updateSettings({
            columns: columns,
            colHeaders: colHeaders,
            data: d.data
        });

    }
    static transpose(matrix)  {

        let cols=[];
        let rownum=1;
        let o=[];
        cols.push(0);
        for (let row of matrix) {
            let colnum=0;
            for (let [key, value] of Object.entries(row)) {
                if (!o[colnum]) o[colnum]={};
                if (rownum==1) {
                    o[colnum][0]=key;

                }
                o[colnum][rownum]=value;// Создаем строки
                colnum++;
            }
            cols.push(rownum);        // Создаем колонки
            rownum++;
        }
        return {data:o,columns:cols};
    }




    static makeWhereIn(ht) {

        let s = HandsTable.getSelected(ht,true);

        let outText = [];
        let columns = ht.getSettings().columns;

        for (let col = s.fromCol; col <= s.toCol; col++) {
            let rr = [];
            for (let row = s.fromRow; row <= s.toRow; row++) {
                rr.push(ht.getDataAtCell(row, col));
            }

            let unique = rr.filter((v, i, a) => a.indexOf(v) === i);

            // get Type of column

            let typeColumn = columns[col].type.toLowerCase();
            if (typeColumn.includes('numeric')) {
                // Если числовая колонка

                outText.push(ht.colToProp(col) + " IN ( " + unique.join(" , ") + ') ');

            } else {
                outText.push(ht.colToProp(col) + " IN ( '" + unique.join("' , '") + "') ");
            }


        }
        outText = "\n" + outText.join("\n\tAND\n") + "\n\n";

        console.log(outText);
        HandsTable.pushToClipboardText(outText);
    }

    static copyToClipboard(ht, styleMarkdown,fullTable) {
        let s = HandsTable.getSelected(ht,true,fullTable);

        let outText = "";
        let cols = [];
        for (let col = s.fromCol; col <= s.toCol; col++) {
            cols.push(ht.colToProp(col));
        }

        outText = outText + " | " + cols.join(" | ") + " |\n";
        cols = [];
        for (let row = s.fromRow; row <= s.toRow; row++) {
            for (let col = s.fromCol; col <= s.toCol; col++) {
                cols.push(ht.getDataAtCell(row, col));
            }
            outText = outText + " | " + cols.join(" | ") + " |\n";
            cols = [];
        }

        HandsTable.pushToClipboardText(outText);


    }

    static HideColumn(ht) {
        let s = HandsTable.getSelected(ht,true);
        let columns = ht.getSettings().columns;
        for (let col = s.fromCol; col <= s.toCol; col++) {
            //width
            columns[col]['width']=0;
        }


        ht.updateSettings({
            columns: columns
        });

    }
    static ShowAllColumns(ht) {
        let columns = ht.getSettings().columns;
        console.info("SHOWALL",columns);
        for (let col of columns) {
              console.info("COL",columns[col]);
        };

        ht.updateSettings({
            columns: columns
        });
    }

    static makeStyle(ht, style) {
        console.log("makeStyle", style);
        let s = HandsTable.getSelected(ht,true);


        for (let row = s.fromRow; row <= s.toRow; row++) {
            for (let col = s.fromCol; col <= s.toCol; col++) {
                let cellMeta = ht.getCellMeta(row, col);
                let cl = 'htCell' + style;
                if (!cellMeta.className || (cellMeta.className && cellMeta.className.indexOf(cl) < 0)) {
                    // добавление класса лучше использовать
                    ht.setCellMeta(row, col, 'className', cl);
                }
            }
        }
        ht.render();
    }



    fecthContextMenu()
    {
        return {
            items: {
                "columnformat": {
                    name: 'Column format',
                    submenu: {
                        items: [
                            {
                                name: "Reset", key: "columnformat:1", callback: function (key, options, pf) {
                                HandsTable.makeFormat(this, 'Reset');
                            },
                            },
                            {
                                name: "Money", key: "columnformat:2", callback: function (key, options, pf) {
                                HandsTable.makeFormat(this, 'Money');
                            },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'numeric');
                                }
                            },
                            {
                                name: "Human", key: "columnformat:3", callback: function (key, options, pf) {
                                HandsTable.makeFormat(this, 'Human');
                            },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'numeric');
                                }
                            },
                            {
                                name: "Bytes", key: "columnformat:4", callback: function (key, options, pf) {
                                HandsTable.makeFormat(this, 'Bytes');
                            },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'numeric');
                                }
                            },
                            {
                                name: "Percentages", key: "columnformat:5", callback: function (key, options, pf) {
                                HandsTable.makeFormat(this, 'Percentages');
                            },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'numeric');
                                }
                            },
                            {
                                name: "Time only", key: "columnformat:6",
                                callback: function (key, options, pf) {
                                    HandsTable.makeFormat(this, 'Time');
                                },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'Time');
                                }
                            },
                            {
                                name: "Date only", key: "columnformat:7", callback: function (key, options, pf) {
                                HandsTable.makeFormat(this, 'Date');
                            },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'Date');
                                }
                            },
                            {
                                name: "Date loc.", key: "columnformat:8", callback: function (key, options, pf) {
                                HandsTable.makeFormat(this, 'DateLoc');
                            },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'Date');
                                }
                            },
                            {
                                name: "Float", key: "columnformat:9", callback: function (key, options, pf) {
                                HandsTable.makeFormat(this, 'Float');
                            },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'numeric');
                                }
                            },
                            {
                                name: "Heatmaps", key: "columnformat:10", callback: function (key, options, pf) {
                                HandsTable.makeHeatmaps(this, 'Heatmaps');
                            },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'numeric');
                                }
                            },
                            {
                                name: "Negative & Positive",
                                key: "columnformat:11",
                                callback: function (key, options, pf) {
                                    HandsTable.makeHeatmaps(this, 'NegaPosi');
                                },
                                disabled: function () {
                                    return !HandsTable.isFormatColl(this, 'numeric');
                                }
                            },


                        ]//items
                    }//submenu
                },

                // -------------------- column Show Hide --------------------------------------------------------------------
                //
                // "columnshowhide": {
                //     name: 'ShowHide Columns',
                //     submenu: {
                //         items: [
                //             {
                //                 name: "Hide this column",
                //                 callback: function (key, options,pf) {
                //                     // HandsTable.makeStyle(this,'Normal');;
                //                     console.log("Hide this column");
                //                 },
                //                 key:"columnshowhide:1"
                //             }//Money
                //         ]//items
                //     },//submenu
                // },
                //


                // -------------------- Style CELL --------------------------------------------------------------------
                "style": {
                    name: 'Style',
                    submenu: {
                        items: [
                            {
                                name: "Normal",
                                callback: function (key, options, pf) {
                                    HandsTable.makeStyle(this, 'Normal');
                                },
                                key: "style:normal"
                            },
                            {
                                name: 'Bold',
                                callback: function (key, options) {
                                    HandsTable.makeStyle(this, 'Bold');
                                },
                                key: "style:makebold"

                            },
                            {
                                name: 'Red color',
                                callback: function (key, options) {
                                    HandsTable.makeStyle(this, 'Red');
                                },
                                key: "style:red"
                            },
                            {
                                name: 'Green color',
                                callback: function (key, options) {
                                    HandsTable.makeStyle(this, 'Green');
                                },
                                key: "style:green"
                            },
                            {
                                name: 'Yellow color',
                                callback: function (key, options) {
                                    HandsTable.makeStyle(this, 'Yellow');
                                },
                                key: "style:yellow"
                            },
                            {
                                name: 'Orange color',
                                callback: function (key, options) {
                                    HandsTable.makeStyle(this, 'Orange');
                                },
                                key: "style:orange"
                            }
                        ]
                    },
                },//style
                "hsep1": "---------",

                // -------------------- Copy to  --------------------------------------------------------------------
                "copyTo": {
                    name: 'To Clipboard',
                    submenu: {
                        items: [
                            {
                                name: "Redmine Markdown",
                                callback: function (key, options, pf) {
                                    console.info("copyToClipboard");
                                    HandsTable.copyToClipboard(this, 'Redmine');
                                },
                                key: "copyTo:1"
                            },//
                            {
                                name: "Redmine Markdown (full)",
                                callback: function (key, options, pf) {
                                    console.info("copyToClipboard");
                                    HandsTable.copyToClipboard(this, 'Redmine',true);
                                },
                                key: "copyTo:2"
                            },//
                            {
                                name: "WHERE col1 IN (val,val),col2 IN ...",
                                callback: function (key, options, pf) {
                                    console.info("makeWhereIn");
                                    HandsTable.makeWhereIn(this);
                                },
                                key: "copyTo:3"
                            },
                            {
                                name: "Create TABLE...",
                                callback: function (key, options, pf) {
                                    HandsTable.makeCreateTable(this);
                                },
                                key: "copyTo:4"
                            },
                            // {
                            //     name: "make Create Table",
                            //     callback: function (key, options, pf) {
                            //         HandsTable.makeCreateTable(this);
                            //     },
                            //     key: "copyTo:4"
                            // }
                        ]//items
                    },//submenu
                },

                // "remove_row":{},
                // "col_left":{},
                // "col_right":{},
                // "remove_col":{},
                "hsep3": "---------",
                // -------------------- Copy to  --------------------------------------------------------------------
                "Transform": {
                    name: "Transpose full table",
                    callback: function (key, options, pf) {
                        HandsTable.Transpose(this, 'Transpose');
                    }
                },
                "Calculate": {
                    name: "Calc Avg & Sum & Median",
                    callback: function (key, options, pf) {
                        HandsTable.Calc(this, 'All');
                    }
                },
                "hsep4": "---------",
                // "HideShow": {
                //     name: 'Hide & Show',
                //     submenu: {
                //         items: [
                //             {
                //                 name: "Hide current column",
                //                 callback: function (key, options, pf) {
                //                     HandsTable.HideColumn(this);
                //                 },
                //                 key: "HideShow:1"
                //             },
                //             {
                //                 name: "Show all columns",
                //                 callback: function (key, options, pf) {
                //                     HandsTable.ShowAllColumns(this);
                //                 },
                //                 key: "HideShow:2"
                //             },
                //         ]//items
                //     },//submenu
                // },
                "undo": {},
                "make_read_only": {},
                "alignment": {},
                "hsep5": "---------",


            }
        };
    }


    makeSettings() {
        // make columns
        let makeColumns = this.makeColumns();

        let o = {
            observeChanges:false, // WARN! Memory leak
            observeDOMVisibility: true,
            dropdownMenu: true,
            manualColumnMove: true,
            manualColumnResize: true,
            rowHeaders: true,
            colWidths: 100,
            fillHandle: false,
            stretchH: 'all',
            customBorders: true,
            isDark: this.isDarkTheme,
            filters: true,
            columnSorting: true,
            sortIndicator: true,
            manualRowResize: true,
            viewportColumnRenderingOffset:'auto',
            wordWrap: false,

            autoColumnSize: {samplingRatio: 23},
            // preventOverflow: 'horizontal',
            columns: makeColumns.columns,
            colHeaders: makeColumns.colHeaders,
            contextMenu: this.fecthContextMenu(),

            // Highlighting selection подсветка строк
            currentRowClassName: (this.isDarkTheme?'currentRowDark':'currentRowWhite'),
            currentColClassName: 'currentCol',

            //----------------------------------------------------------------------------------------------------
            // colWidths:handsontable.colWidths;
            //contextMenuCopyPaste: {
            //    swfPath: '/bower_components/zeroclipboard/dist/ZeroClipboard.swf'
            //},
            // visibleRows:120,
            // width:'100%',
            // height:'100%',
            // fixedRowsTop: 1,
            // fixedColumnsLeft: 1,
            // maxRows: 1000,
            renderAllRows:false,
            visibleRows:1500
        };


        if (this.Preset.sort) {
            o.columnSorting = {
                column: makeColumns.colPositions[this.Preset.sort]
            };
            o.columnSorting.sortOrder=this.Preset.sortOrder;
        }
        return o;


    }

}

angular.module(smi2.app.name).service('HandsTable', HandsTable);
