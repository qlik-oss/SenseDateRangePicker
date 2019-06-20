/**
 * @license
 * Copyright 2018 Nodier Torres. All rights reserved.
 * 
 * Copyrights licensed under the terms of the MIT license.
 * Original source <https://github.com/NOD507/SenseDateRangePicker>
 */
define([
  "qlik",
  "jquery",
  "./lib/moment.min",
  "./calendar-settings",
  "./lib/daterangepicker.less",
  "./lib/daterangepicker"
], function (qlik, $, moment, CalendarSettings) {
  'use strict';

  function createDate(num) {
    return moment((num - 25569) * 86400 * 1000).utc().format("YYYYMMDD").toString();
  }

  function createMoment(str, format) {
    if (isNaN(str)) {
      return moment.utc(str, format);
    }
    return moment.utc(createDate(str), 'YYYYMMDD');
  }

  function createRanges(props) {
    var ranges = {};
    ranges[props.today] = [
      moment().startOf('day'),
      moment().startOf('day')];
    ranges[props.yesterday] = [
      moment().subtract(1, 'days').startOf('day'),
      moment().subtract(1, 'days').startOf('day')];
    ranges[props.lastXDays.replace("$", "7")] = [
      moment().subtract(6, 'days').startOf('day'),
      moment().startOf('day')];
    ranges[props.lastXDays.replace("$", "30")] = [
      moment().subtract(29, 'days').startOf('day'),
      moment().startOf('day')];
    ranges[props.thisMonth] = [
      moment().startOf('month').startOf('day'),
      moment().endOf('month').startOf('day')];
    ranges[props.lastMonth] = [
      moment().subtract(1, 'month').startOf('month').startOf('day'),
      moment().subtract(1, 'month').endOf('month').startOf('day')];
    return ranges;
  }
  function createDateStates(pages, sortAscending) {
    var dateStates = {};
    pages.forEach(function (page) {
      page.qMatrix.forEach(function (row) {
        var d = createDate(row[0].qNum);
        dateStates[d] = row[0].qState;
        //based on order numerically
        if (row[0].qState === 'S') {
          if (sortAscending) {
            dateStates.rangeStart = dateStates.rangeStart || row[0].qNum;
            dateStates.rangeEnd = row[0].qNum;
          } else {
            dateStates.rangeEnd = dateStates.rangeEnd || row[0].qNum;
            dateStates.rangeStart = row[0].qNum;
          }
        }
      });
    });
    return dateStates;
  }
  function createHtml(dateStates, DateFormat, props) {
    var html = `<div>
      <div class="bootstrap_inside pull-right show-range">
      <i class="lui-icon lui-icon--calendar"></i>&nbsp;<span>`;
    if (dateStates.rangeStart) {
      html += createMoment(dateStates.rangeStart).format(DateFormat);
      if (dateStates.rangeEnd && (dateStates.rangeEnd !== dateStates.rangeStart)) {
        html += props.separator + createMoment(dateStates.rangeEnd).format(DateFormat);
      }
    } else {
      html += props.defaultText;
    }
    html += `</span> <b class="lui-button__caret lui-caret"></b></div></div>`;
    return html;
  }
  return {
    methods: { //for testability
      createDate: createDate,
      createMoment: createMoment,
      createRanges: createRanges,
      createDateStates: createDateStates,
      createHtml: createHtml
    },
    initialProperties: {
      version: 1.0,
      qListObjectDef: {
        qDef: {
          autoSort: false,
          qSortCriterias: [
            { qSortByNumeric: -1 },
            { qSortByState: 1 },
          ],
        },
        qShowAlternatives: true,
        qFrequencyMode: "V",
        qInitialDataFetch: [{
          qWidth: 1,
          qHeight: 10000
        }]
      },
      advanced: false
    },
    // Prevent conversion from and to this object
    exportProperties: null,
    importProperties: null,
    definition: CalendarSettings,
    support: {
      snapshot: false,
      export: false,
      exportData: false
    },
    paint: function ($element, layout) {
      var self = this;
      var interactionState = this.$scope.options.interactionState;
      var noSelections = this.options.noSelections === true;

      // old sort order was ascending, check to see if the object was created before the change
      // to calcuate the range start and end dates in the createDateStates
      var sortAscending = layout
        && layout.qListObject
        && layout.qListObject.qSortCriterias
        && layout.qListObject.qSortCriterias.qSortByNumeric == "1";

      function canInteract() {
        return interactionState === 1;
      }
      this.dateStates = createDateStates(layout.qListObject.qDataPages, sortAscending);
      if (!self.app) {
        self.app = qlik.currApp(this);
      }

      //console.log('dateStates', this.dateStates);
      var qlikDateFormat = layout.qListObject.qDimensionInfo.qNumFormat.qFmt
        || self.app.model.layout.qLocaleInfo.qDateFmt;
      var outDateFormat = layout.props.format || qlikDateFormat;
      moment.locale(layout.props.locale);
      var minDate = createMoment(layout.props.minDate, qlikDateFormat);
      var maxDate = createMoment(layout.props.maxDate, qlikDateFormat);
      var startDate = createMoment(layout.props.startDate, qlikDateFormat);
      var endDate = createMoment(layout.props.endDate, qlikDateFormat);

      $('#dropDown_' + layout.qInfo.qId).remove();

      $element.html(createHtml(this.dateStates, outDateFormat, layout.props));

      var config = {
        singleDatePicker: layout.props.isSingleDate,
        preventSelections: noSelections,
        "locale": {
          "format": outDateFormat,
          "separator": layout.props.separator
        },
        "parentEl": "#grid",
        "autoUpdateInput": false,
        "autoApply": true,
        "opens": $element.offset().left < 500 ? "right" : "left",
        "id": layout.qInfo.qId,
        getClass: function (date) {
          var d = date.format('YYYYMMDD');
          if (self.dateStates[d]) {
            return 'state' + self.dateStates[d];
          }
          return 'nodata';
        }
      };

      if (minDate.isValid()) {
        config.minDate = minDate;
      }

      if (maxDate.isValid()) {
        config.maxDate = maxDate;
      }

      if (startDate.isValid()) {
        config.startDate = startDate;
      } else {
        config.startDate = config.minDate;
      }

      if (endDate.isValid()) {
        config.endDate = endDate;
      } else {
        config.endDate = config.maxDate;
      }

      if (layout.props.CustomRangesEnabled) {
        config.locale.customRangeLabel = layout.props.customRangeLabel;
        config.ranges = createRanges(layout.props);
      }

      if (canInteract()) {
        $element.find('.show-range').qlikdaterangepicker(config, function (pickStart, pickEnd, label) {
          if (!noSelections && pickStart.isValid() && pickEnd.isValid()) {
            var dateBinarySearch = function (seachDate, lowIndex, highIndex) {
              if (lowIndex === highIndex) {
                return lowIndex;
              }

              var middleIndex = lowIndex + Math.ceil((highIndex - lowIndex) / 2);
              var middleDate = moment.utc(
                layout.qListObject.qDataPages[0].qMatrix[middleIndex][0].qText,
                qlikDateFormat);

              // The matrix stores the dates from latest to earliest, so if the
              // sought date is after the middle date, pick the lower index span
              if (seachDate.isAfter(middleDate)) {
                return dateBinarySearch(seachDate, lowIndex, middleIndex - 1);
              }
              return dateBinarySearch(seachDate, middleIndex, highIndex);
            };

            var lastIndex = layout.qListObject.qDataPages[0].qMatrix.length - 1;
            // Elements are stored in reverse order, so pick out index of end first
            var lowIndex = dateBinarySearch(pickEnd.startOf('day'), 0, lastIndex);
            // Index of start is guaranteed to be >= index of end
            var highIndex = dateBinarySearch(pickStart, lowIndex, lastIndex);

            var qElemNumbers = layout.qListObject.qDataPages[0].qMatrix
              .slice(lowIndex, highIndex + 1).map(function (fieldValue) {
                return fieldValue[0].qElemNumber;
              });

            self.backendApi.selectValues(0, qElemNumbers, false);
          }
        });
      }
    }
  };
});