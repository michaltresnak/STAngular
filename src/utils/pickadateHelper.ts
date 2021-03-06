/// <reference path="../angular/angular.d.ts" />
/// <reference path="../moment.d.ts" />

module STUtils {

    export class PickadateHelper {

        bindPickadateForAngular(elm: JQuery, utcDate, dateFormat: string, scope: ng.IScope, ctrl: ng.INgModelController, parse: ng.IParseService) : Pickadate.IPickadate {

            var bindingConfig: IBindingConfig = {
                init: () => {
                    setTimeout(() => {
                        var date = ctrl.$modelValue ? moment(ctrl.$modelValue).toDate() : null;
                        if (date != null) {
                            datepicker.set('select', date);    
                        }

                        if (elm.attr('min') != null) {
                            scope.$watch(elm.attr('min'), (value) => {
                                var minDate: Date = parseDateAttr(elm.attr('min'), scope, parse, true);
                                datepicker.set('min', minDate);
                            });
                        }

                        if (elm.attr('max') != null) {
                            scope.$watch(elm.attr('max'), (value) => {
                                var maxDate: Date = parseDateAttr(elm.attr('max'), scope, parse);
                                datepicker.set('max', maxDate);
                            });
                        }
                        
                    });

                    scope.$on('sgDate.Opened', (event, ...args: any[]) => {
                        var element: Element = args[0];
                        var clickedOnOtherWidget: boolean = element != elm[0];
                        if (clickedOnOtherWidget) {
                            datepicker.close();
                        }
                    });

                },
                onSet: (context) => {
                    if (context) {
                        if (context.select) {
                            var date = moment(context.select);
                            var viewDate: string = date.format(dateFormat);

                            elm.val(viewDate);
                            scope.$apply(() => ctrl.$setViewValue(viewDate));
                        }

                        if (context.hasOwnProperty('clear')) {
                            elm.val(null);
                            scope.$apply(() => ctrl.$setViewValue(null));
                        }
                    }
                },
                onOpen: () => {
                    scope.$emit('sgDate.Opened', elm[0]);
                },
                onClose: () => {
                    destroyDatepicker(elm);
                }
            }

            var datepicker: Pickadate.IPickadate = bindDatepickerBase(elm, utcDate, dateFormat, bindingConfig);
            return datepicker;
        } //end of binding for Angular

        bindPickadateForForReact(elm: JQuery, utcDate, dateFormat: string, onSet: (any) => void): Pickadate.IPickadate {
            var bindingConfig: IBindingConfig = {
                onSet: onSet
            };

            var datepicker: Pickadate.IPickadate = bindDatepickerBase(elm, utcDate, dateFormat, bindingConfig);
            return datepicker;
        }//End of React

        parseDateAttr(attr: string, scope: ng.IScope, parse: ng.IParseService, isMin: boolean = false): Date {
            return parseDateAttr(attr, scope, parse, isMin);
        }

    } //end of class

    function parseDateAttr(attr: string, scope: ng.IScope, parse: ng.IParseService, isMin: boolean = false) : Date {
        var dataValue: Moment = null;

        if (attr.indexOf('now.') == 0) {
            var dotIndex = attr.indexOf('.');
            dataValue = moment(new Date); //used in eval() on next row, but R# does not know that
            dataValue = eval('dataValue' + attr.substr(dotIndex));
        }
        else if (attr.indexOf('now') == 0) {
            dataValue = moment(new Date);
        } else {
            //try to parse value
            var parsedValue = parse(attr)(scope);

            if (angular.isObject(parsedValue)) {
                dataValue = parsedValue;
            }
            else dataValue = moment(parsedValue);
        }

        //Add midnight limit
        var resultDate: Date = dataValue.toDate();
        if (isMin == false) {
            resultDate.setHours(23, 59, 59, 999);    
        } else {
            resultDate.setHours(0, 0, 0, 0);
        }

        return resultDate;
    }

    var iconConfig: Pickadate.IPickadateIconConfig = {
        iconMargin: 3, //px
        iconRight: 5, //px
        iconTop: 7, //px
        iconWidth: 13, //px
        widgetWidth: 420 //px
    }

    function getDefaultDatepickerConfig() {
        var config: Pickadate.IPickadateConfig = {
            selectYears: 90,
            max: new Date(new Date().getFullYear() + 5, 1, 1),
            selectMonths: true,
            editable: true,
            //The supported formats are listed here: http://amsul.ca/pickadate.js/date.htm#formatting-rules
            format: '', //Beware: The picker.date does not support moment.js formatting
        };

        return config;
    }

    function destroyDatepicker(input) {
        var picker = input.pickadate('picker');
        if (picker != null) {
            picker.destroy();
        }
    }

    interface IBindingConfig {
        init?: () => void;
        onSet?: (context: any) => void;
        onOpen?: () =>void;
        onClose?: () =>void;
    }

    var dataKeyIsOpen = 'stPickadate_isWidgetOpen';
    var dataKeyIsWrapped = 'stPickadate_isWrapped';

    function getIsWidgetOpen(elm: JQuery) {
        return elm.data(dataKeyIsOpen);
    }

    function setIsWidgetOpen(elm: JQuery, value: boolean) {
        elm.data(dataKeyIsOpen, value);
    }

    function getIsWidgetWrapped(elm: JQuery) {
        return elm.data(dataKeyIsWrapped);
    }
    
    function setIsWidgetWrapped(elm: JQuery, value: boolean) {
        elm.data(dataKeyIsWrapped, value);
    }

    function wrapInput(elm: JQuery) {
        var display = window.getComputedStyle(elm[0]).display;

        elm.wrap('<div></div>');
        var wrapper = elm.parent();
        wrapper.css({ display: display, position: 'relative' });

        setIsWidgetWrapped(elm, true);

        var iconCss = {
            width: iconConfig.iconWidth + 'px',
            position: 'absolute',
            right: iconConfig.iconRight + 'px',
            top: iconConfig.iconTop + 'px',
            'margin-top': '0px'
        };
        var icon: JQuery = $('<i/>', { 'class': 'fa fa-calendar clickable', css: iconCss });
        wrapper.append(icon);

        return wrapper;
    }

    function isFunction(value) { return typeof value === 'function'; }

    function bindDatepickerBase(elm: JQuery, utcDate, dateFormat: string, bindingConfig: IBindingConfig): Pickadate.IPickadate{
       
        if (isFunction($()['pickadate'])) {

            var wrapper: JQuery,
                icon: JQuery;

            if (elm.prop('disabled') || elm.prop('readonly')) {
                return null;
            }

            if (getIsWidgetWrapped(elm)) {
                wrapper = elm.parent();
            } else {
                wrapper = wrapInput(elm);
            }

            icon = wrapper.find('.fa-calendar');

            if (bindingConfig.init) {
                bindingConfig.init();
            }

            var pickadateConfig: Pickadate.IPickadateConfig = getDefaultDatepickerConfig();
            pickadateConfig.format = dateFormat.toLowerCase();

            var onOpen = () => {
                setIsWidgetOpen(elm, true);

                if (isFunction(bindingConfig.onOpen)) {
                    bindingConfig.onOpen();
                }    
            }

            var onClose = () => {
                setIsWidgetOpen(elm, false);

                if (isFunction(bindingConfig.onClose)) {
                    bindingConfig.onClose();
                }
            }

            pickadateConfig.onOpen = onOpen;
            pickadateConfig.onClose = onClose;

            if (isFunction(bindingConfig.onSet)) {
                pickadateConfig.onSet = bindingConfig.onSet;
            }
            
            icon.on('click.sgDate', (event: Event) => {

                if (elm.prop('disabled') || elm.prop('readonly')) {
                    datepicker.stop();
                    return;
                }
                
                if (getIsWidgetOpen(elm)) {
                    event.stopPropagation();

                    datepicker.close();

                    //There is already onclick listerer attached in picker.js which is bound before this listerener
                    //Therefore we can't stop it from execution by event.stopPropagation() or event.preventDefault()
                    //Result is that the widget re-opens
                    //workaround is to stop() it (which destroys all event listeners)
                    //and recreate it by calling bindDatePicker()
                    datepicker.stop();

                    icon.off('click.sgDate');

                    setTimeout(() => {
                        bindDatepickerBase(elm, elm.val(), dateFormat, bindingConfig);
                    }, 10);

                    return;
                }
                
                var value = elm.val();
                if (value == '') {
                    value = null;
                }

                var date = value !=null ? moment(value, dateFormat) : null;
                if (date != null) {
                    datepicker.set(Pickadate.pickadateSetThing.select, date.toDate(), { format: dateFormat.toLowerCase() });
                }

                var widgetHolder = wrapper.find('.picker__holder');
                widgetHolder.css('width', iconConfig.widgetWidth);
            });

            var input = (<any>icon).pickadate(pickadateConfig);
            var datepicker: Pickadate.IPickadate = input.pickadate('picker');

            return datepicker;
        }
    }

    
}