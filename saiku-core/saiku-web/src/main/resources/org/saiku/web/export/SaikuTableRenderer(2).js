
var SaikuTableRenderer = _.extend(SaikuRenderer, {

    key: "table",
});

SaikuTableRenderer.prototype._render = function(data, options) {
        if (data) {
            this._data = data;
        }
        if (options) {
            this._options = _.extend(options, SaikuRendererOptions);
        }

        if (typeof this._data == "undefined") {
            return;
        }

        if (this._data != null && this._data.error != null) {
            return;
        }        
        if (this._data == null || (this._data.cellset && this._data.cellset.length === 0)) {
            return;
        }

        var html =  this.internalRender(this._data.cellset);
        if (this._options.htmlObject) {
            $(this._options.htmlObject).html(html);
        }
        return html;
};

SaikuTableRenderer.prototype._processData = function(data, options) {
    this._hasProcessed = true;
};

function nextParentsDiffer(data, row, col) {
  while (row-- > 0) {
    if (data[row][col].properties.uniquename != data[row][col + 1].properties.uniquename)
      return true;
  }
  return false;
}

function topParentsDiffer(data, row, col) {
    while (col-- > 0)
        if (data[row][col].properties.uniquename != data[row - 1][col].properties.uniquename)
            return true;
    return false;
}

function findSum(data, row, col, measureColumn){
  var sum = 0.00;
  var firstRow = row;
  while (data[row][col].value == data[firstRow][col].value) {
    if(data[firstRow][measureColumn].value.indexOf('.') > 0 && data[firstRow][measureColumn].value.indexOf(',') > 0){
      sum += Number(data[firstRow][measureColumn].value.replace(/[^-0-9\.-]/g,""));
    } else {
      sum += Number(data[firstRow][measureColumn].value.replace(/[^0-9\,-]/g, '').replace(',', '.'));
    }
    firstRow--;
  }
  if(data[1][measureColumn].value.indexOf('.') > 0 && data[1][measureColumn].value.indexOf(',') > 0){
    return format('#,##0.00', sum);
  } else {
    return format('# ##0,00', sum);
  }
}

function firstColumnsSum(data, measureColumn, lastHeaderRow){
  var sum = 0.00;
  var row = lastHeaderRow;
  while (row < data.length) {
    if(data[row][measureColumn].value.indexOf('.') > 0 && data[row][measureColumn].value.indexOf(',') > 0){
      sum += Number(data[row][measureColumn].value.replace(/[^-0-9\.-]/g,""));
    } else {
      sum += Number(data[row][measureColumn].value.replace(/[^0-9\,-]/g, '').replace(',', '.'));
    }
    row++;
  }
  if(data[1][measureColumn].value.indexOf('.') > 0 && data[1][measureColumn].value.indexOf(',') > 0){
    return format('#,##0.00', sum);
  } else {
    return format('# ##0,00', sum);
  }
}

SaikuTableRenderer.prototype.internalRender = function(data, options) {
    var contents = "";
    var table = data ? data : [];
    var colSpan;
    var colValue;
    var isHeaderLowestLvl;
    var isBody = false;
    var firstColumn;
    var isLastColumn, isLastRow;
    var nextHeader;
    var processedRowHeader = false;
    var lowestRowLvl = 0;
    var rowGroups = [];
    contents +="<thead>";
    var lastRenderedRow;
    var itogRowExists = false;
    var prevColumnSum;
    var measuresCount = 0;
    var lastHeaderRow = 1000;

    for (var row = 0, rowLen = table.length; row < rowLen; row++) {
        colSpan = 1;
        colValue = "";
        isHeaderLowestLvl = false;
        isLastColumn = false;
        isLastRow = false;
        var headerSame = false;

        contents += "<tr>";

        for (var col = 0, colLen = table[row].length; col < colLen; col++) {
            var header = data[row][col];

            // If the cell is a column header and is null (top left of table)
            if (header.type === "COLUMN_HEADER" && header.value === "null" && (firstColumn == null || col < firstColumn)) {
                contents += '<th class="all_null"><div>&nbsp;</div></th>';
            } // If the cell is a column header and isn't null (column header of table)
            else if (header.type === "COLUMN_HEADER") {
                if (firstColumn == null) {
                    firstColumn = col;
                }
                if (table[row].length == col+1)
                    isLastColumn = true;
                else
                    nextHeader = data[row][col+1];
                if(header.properties.dimension == 'Measures'){
                  measuresCount++;
                }

                if (isLastColumn) {
                    // Last column in a row...
                    if (header.value == "null") {
                        contents += '<th class="col_null"><div>&nbsp;</div></th>';
                    } else {
                      contents += '<th class="col" style="text-align: center;" colspan="' + colSpan + '"><div rel="' + row + ":" + col +'">' + header.value + '</div></th>';
                    }
                    
                } else {
                    // All the rest...
                    var groupChange = (col > 1 && row > 1 && !isHeaderLowestLvl && col > firstColumn) ?
                        data[row-1][col+1].value != data[row-1][col].value || data[row-1][col+1].properties.uniquename != data[row-1][col].properties.uniquename
                        : false;
                    var maxColspan = colSpan > 999 ? true : false;
                    if (header.value != nextHeader.value || nextParentsDiffer(data, row, col) || isHeaderLowestLvl || groupChange || maxColspan) {
                        if (header.value == "null") {
                            contents += '<th class="col_null" colspan="' + colSpan + '"><div>&nbsp;</div></th>';
                        } else {
                            contents += '<th class="col" style="text-align: center;" colspan="' + (colSpan == 0 ? 1 : colSpan) + '"><div rel="' + row + ":" + col +'">' + header.value + '</div></th>';
                        }
                        colSpan = 1;
                    } else {
                        colSpan++;
                    }
                }
            } // If the cell is a row header and is null (grouped row header)
            else if (header.type === "ROW_HEADER" && header.value === "null") {
                contents += '<th class="row_null"><div>&nbsp;</div></th>';
            } // If the cell is a row header and isn't null (last row header)
            else if (header.type === "ROW_HEADER") {
                if (lowestRowLvl == col)
                    isHeaderLowestLvl = true;
                else
                    nextHeader = data[row][col+1];

                var previousRow = data[row - 1];

                var same = !headerSame && !isHeaderLowestLvl && (col == 0 || !topParentsDiffer(data, row, col)) && header.value === previousRow[col].value;
                headerSame = !same;
                var value = (same ? "<div>&nbsp;</div>" : '<div rel="' + row + ":" + col +'">' + header.value + '</div>');
                var tipsy = "";
                /* var tipsy = ' original-title="';
                if (!same && header.metaproperties) {
                    for (key in header.metaproperties) {
                        if (key.substring(0,1) != "$" && key.substring(1,2).toUpperCase() != key.substring(1,2)) {
                            tipsy += "<b>" + safe_tags_replace(key) + "</b> : " + safe_tags_replace(header.metaproperties[key]) + "<br>";
                        }
                    }
                }
                tipsy += '"';
                */
                var cssclass = (same ? "row_null" : "row");
                var colspan = 0;

                if (!isHeaderLowestLvl && (typeof nextHeader == "undefined" || nextHeader.value === "null")) {
                    colspan = 1;
                    var group = header.properties.dimension;
                    var level = header.properties.level;
                    var groupWidth = (group in rowGroups ? rowGroups[group].length - rowGroups[group].indexOf(level + col) : 1);
                    for (var k = col + 1; colspan < groupWidth && k <= (lowestRowLvl+1) && data[row][k] !== "null"; k++) {
                        colspan = k - col;
                    }
                    col = col + colspan -1;
                }
                // бежим с конца строки и провреяем, не должны ли мы вынести сумму
                // Не совпадает предыдущим загловоком, значит надо посчитать сумму
                  contents += '<th class="' + cssclass + '" ' + (colspan > 0 ? ' colspan="' + colspan + '"' : "") + tipsy + '>' + value + '</th>';
            }
            else if (header.type === "ROW_HEADER_HEADER") {
                contents += '<th class="row_header"><div>' + header.value + '</div></th>';
                isHeaderLowestLvl = true;
                processedRowHeader = true;
                lowestRowLvl = col;
                if (header.properties.hasOwnProperty("dimension")) {
                    var group = header.properties.dimension;
                    if (!(group in rowGroups)) {
                        rowGroups[group] = [];
                    }
                    rowGroups[group].push(header.properties.level + col);
                }
            } // If the cell is a normal data cell
            else if (header.type === "DATA_CELL") {
                var color = "";
                var val = header.value;
                var arrow = "";
                if (header.properties.hasOwnProperty('image')) {
                    var img_height = header.properties.hasOwnProperty('image_height') ? " height='" + header.properties.image_height + "'" : "";
                    var img_width = header.properties.hasOwnProperty('image_width') ? " width='" + header.properties.image_width + "'" : "";
                    val = "<img " + img_height + " " + img_width + " style='padding-left: 5px' src='" + header.properties.image + "' border='0'>";
                }

                if (header.properties.hasOwnProperty('style')) {
                    color = " style='background-color: " + header.properties.style + "' ";
                }
                if (header.properties.hasOwnProperty('link')) {
                    val = "<a target='__blank' href='" + header.properties.link + "'>" + val + "</a>";
                }
                if (header.properties.hasOwnProperty('arrow')) {
                    arrow = "<img height='10' width='10' style='padding-left: 5px' src='./images/arrow-" + header.properties.arrow + ".gif' border='0'>";
                }

                contents += '<td class="data" ' + color + '><div alt="' + header.properties.raw + '" rel="' + header.properties.position + '">' + val + arrow + '</div></td>';
            }
        }
        lastRenderedRow = row;
        if(itogRowExists){
          row--;
        }
        itogRowExists = false;
        contents += "</tr>";
        if(isLastColumn && isHeaderLowestLvl && header.value!="null"){
            contents +='</thead><tbody>';
            lastHeaderRow = row + 1;
        }

    }
    if (measuresCount > 0) {
      contents += "<tr>";
      prevColumnSum = table[table.length - 1].length - measuresCount - 2;
      col = 0;
      // Необходимо добавить последние итоги
      if (col < prevColumnSum) {
        //Здесь необходим цикл для всех колонок, что вывестись раньше должны !!!!!
        for (var o = col; o < prevColumnSum; o++) {
          contents += '<th class="row_null"></th>'
        }
        //Находим сумму всех значений по колонкам с мерами, заканчивая строкой row, двигаясь в обратном направлении, причем разыскивая предыдущую row с отличающимся названием в col
        contents += '<th class="row sums_row" >' + 'Итого' + '</th><th class="row after_sums_row" colspan="' + (table[table.length - 1].length - prevColumnSum - measuresCount - 1) + '"' + '></th>';
        for (z = 0; z < measuresCount; z++) {
          contents += '<td class="data"><div>' + findSum(data, table.length - 1, prevColumnSum, table[table.length - 1].length - measuresCount + z) + '</div></td>';
        }
        contents += '</tr><tr>';
        prevColumnSum--;
        while (col < prevColumnSum) {
          for (var z = 0; z < prevColumnSum; z++) {
            contents += '<th class="row_null"></th>'
          }
          contents += '<th class="row sums_row">' + 'Итого' + '</th><th class="row after_sums_row" colspan="' + (table[table.length - 1].length - prevColumnSum - measuresCount - 1) + '"' + '></th>';
          for (z = 0; z < measuresCount; z++) {
            contents += '<td class="data"><div>' + findSum(data, table.length - 1, prevColumnSum, table[table.length - 1].length - measuresCount + z) + '</div></td>';
          }
          contents += '</tr><tr>';
          prevColumnSum--;
        }
        for (var z = 0; z < col; z++) {
          contents += '<th class="row_null"></th>'
        }
      }
      contents += "</tr><tr>"
      if (table[table.length - 1].length - measuresCount > 1) {
        contents += '<th class="row sums_row" >' + 'Итого' + '</th><th class="row after_sums_row " colspan="' + (table[table.length - 1].length - measuresCount - 1) + '"' + '></th>';
        for (z = 0; z < measuresCount; z++) {
          contents += '<td class="data"><div>' + findSum(data, table.length - 1, 0, table[table.length - 1].length - measuresCount + z) + '</div></td>';
        }
      }
      contents += "</tr><tr>"
      // Общая сумма по 1 колонке
      if (data[0][0].value != 'null') {
        contents += '<th style="border-top:1px solid #d5d5d5;" class="row all_sums_row" colspan="' + (table[table.length - 1].length - measuresCount) + '">Итого для измерения ' + data[0][0].value + '</th>';
        for (z = 0; z < measuresCount; z++) {
          contents += '<td class="data"><div>' + firstColumnsSum(data, table[table.length - 1].length - measuresCount + z, lastHeaderRow) + '</div></td>';
        }
      }
      contents += "</tr>";
    }
    return "<table id='results_table'>" + contents + "</tbody></table>";
}