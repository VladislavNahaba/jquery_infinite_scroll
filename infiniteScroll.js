class InfiniteScroll {
    
    constructor(container, urlConfig = {
        url: null,
        params: null
    }, settings = {
        scrollThreshold: 0,
        appendTo: null,
        lastHtml: null,
        errorHtml: null,
        loader: null,
        loadingHtml: null,
        autoTrigger: true,
        cache: false,
        intervalCheck: false,
        intervalTime: 40,
        nextSelector: null,
        autoTriggerUntil: null,
        requestType: 'get'
    }) {
        const defaultValues = {
            scrollThreshold: 0,
            appendTo: null,
            lastHtml: null,
            errorHtml: null,
            loader: null,
            loadingHtml: null,
            autoTrigger: true,
            cache: false,
            intervalCheck: false,
            intervalTime: 40,
            nextSelector: null,
            autoTriggerUntil: null,
            requestType: 'get'
        };
        
        this.__settings = Object.assign(defaultValues, settings);
        this.__contructorValuesCheck(container, urlConfig, this.__settings);
        
        this.__$container = this.__initSelector(container);
        this.__$appendTo = this.__settings.appendTo ? this.__$container.find(this.__settings.appendTo) : this.__$container;
        this.__urlConfig = urlConfig;

        this.__urlType = this.__checkUrlType(this.__urlConfig.url) ? 'absolute' : 'relative';

        this.__isWindow = (this.__$container.css('overflow-y') === 'visible');

        this.__reachedStatus = false;
        this.__loading = false;
        this.__done = false;
        this.__errors = [];
        this.__counter = 0;
        this.__callbacks = {
            'init': () => {},
            'reached': () => {},
            'response': () => {},
            'error': () => {},
            'last': () => {}
        };

        this.__$window = $(window);
        this.__$scroll = this.__isWindow ? this.__$window : this.__$container;
        this.__$body = $('body');

        this.__cache = [];
        if (this.__settings.cache) {
            this.clearCache = () => {
                this.__cache = [];
            }
            this.getFromCache = (index) => {
                if (index >= this.__cache.length || index < 0 || !Number.isInteger(index)) {
                    throw new Error('InfiniteScroll method getFromCache error: invalid index');
                }
                const cachedElement = this.__cache[index];
                this.__cache.splice(1, index);
                return cachedElement;
            }
            this.saveInCache = (data) => {
                this.__cache.push(data);
            }
            this.makeAjax = (urlConfig) => {
                if (!this.__done) {
                    this.__loading = true;
                    this.__ajaxRequest(urlConfig);
                }
            }
            this.append = (template) => {
                this.__$appendTo.append(template);
                this.__reachedStatus = false;
            };
        }
    }

    get urlConfig() {
        return this.__urlConfig;
    }

    set urlConfig(urlConfig) {
        this.__urlConfig = urlConfig;
    }

    init() {
        if (this.__settings.intervalCheck) {
            this.__intervalCheckScrollPosition();
        } else {
            this.__bindEventListeners();
        }
        this.__callbacks['init'](this.urlConfig);
    }

    __contructorValuesCheck(container, urlConfig, settings) {
        if (!window.jQuery) {
            throw new Error('InfiniteScroll constructor error: jQuery is not loaded');
        }
        if (!container) {
            throw new Error('InfiniteScroll constructor error: container is not specified');
        }
        if (!urlConfig) {
            throw new Error('InfiniteScroll constructor error: urlConfig is not specified');
        }
        if (!urlConfig.url) {
            throw new Error('InfiniteScroll constructor error: urlConfig.url is not specified');
        }
        if (!Number.isInteger(settings.scrollThreshold)) {
            throw new Error('InfiniteScroll constructor error: scrollThreshold must be a integer');
        }
        if (!settings.autoTrigger && !settings.nextSelector) {
            throw new Error('InfiniteScroll constructor error: AutoTrigger set to false, but nextSelector is not defined');
        }
        if (settings.intervalCheck && !Number.isInteger(settings.intervalTime)) {
            throw new Error('InfiniteScroll constructor error: intervalTime must be a integer');
        }
        if (settings.intervalCheck && settings.intervalTime < 0) {
            throw new Error('InfiniteScroll constructor error: intervalTime can\'t be less than 0');
        }
        if (settings.autoTriggerUntil !== null && !Number.isInteger(settings.autoTriggerUntil)) {
            throw new Error('InfiniteScroll constructor error: autoTriggerUntil must be a integer');
        }
        if (settings.autoTriggerUntil !== null && settings.autoTriggerUntil < 0) {
            throw new Error('InfiniteScroll constructor error: autoTriggerUntil can\'t be less than 0');
        }
    }

    __initSelector(selector) {
        if (typeof selector === 'string') {
            return jQuery(selector);
        }
        return selector;
    }

    __showLoader() {
        if (this.__settings.loader) {
            if (!this.loader) {
                this.loader = this.__initSelector(this.__settings.loader);
            }
            this.loader.show();
        }
        if (this.__settings.loadingHtml) {
            this.__$appendTo.append('<span class="infinite-scroll-loader-handler" style="visibility: hidden;"></span>' + this.__settings.loadingHtml);
        }
    }

    __hideLoader() {
        if (this.__settings.loader) {
            if (!this.loader) {
                this.loader = this.__initSelector(this.__settings.loader);
            }
            this.loader.hide();
        }
        if (this.__settings.loadingHtml) {
            const $loader = this.__$appendTo.find('span.infinite-scroll-loader-handler');
            $loader.next().remove();
            $loader.remove();
        }
    }

    __checkUrlType(url) {
        const pattern = new RegExp('^(?:[a-z]+:)?//', 'i');
        return pattern.test(url);
    }

    __getSafeParams(url, params) {
        let urlObject = null;
        if (this.__urlType === 'absolute') {
            urlObject = new URL(url);
        } else if (this.__urlType === 'relative') {
            urlObject = new URL(url, document.location.protocol + '//' + document.location.host + '/');
        } 

        if (typeof params === 'object') {
            for (const [key, value] of Object.entries(params)) {
                urlObject.searchParams.set(key, value);
            }
        }
        return urlObject.toString();
    }

    __clone(obj) {
        if (obj === null || typeof (obj) !== 'object' || 'isActiveClone' in obj)
            return obj;
    
        if (obj instanceof Date)
            var temp = new obj.constructor();
        else
            var temp = obj.constructor();
    
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj['isActiveClone'] = null;
                temp[key] = this.__clone(obj[key]);
                delete obj['isActiveClone'];
            }
        }
        return temp;
    }

    __ajaxRequest(urlConfig) {
        const deepClone = this.__clone(urlConfig);
        this.__showLoader();
        if (this.__settings.requestType.toLowerCase() === 'get') {
            $.ajax({
                url: urlConfig.params
                ? this.__getSafeParams(urlConfig.url, urlConfig.params)
                : urlConfig.url,
                type: 'GET',
                success: (data, status) => {
                    this.__successResponse(data, deepClone, status);
                },
                error: (error) => {
                    this.__errorResponse(error);
                }
            });
        } else if (this.__settings.requestType.toLowerCase() === 'post') {
            $.ajax({
                url: urlConfig.url,
                type: 'POST',
                data: urlConfig.params,
                success: (data, status) => {
                    this.__successResponse(data, deepClone, status);
                },
                error: (error) => {
                    this.__errorResponse(error);
                }
            });
        }
    }

    __successResponse(data, urlConfig, status) {
        this.__counter++;
        this.__loading = false;
        this.__hideLoader();
        this.__responseHandler(data, urlConfig);
    }

    __errorResponse(error) {
        this.__loading = false;
        this.__done = true;
        this.__errors.push({status: error.status, responseText: error.responseText});
        this.__hideLoader();
        this.__renderErrorHtmlTemplate();
        const workContinue = () => {
            this.__done = false;
            this.__loading = true;
            this.__ajaxRequest(this.__urlConfig);
        };
        this.__callbacks['error'](error, workContinue, this.urlConfig, this.__getInfo());
    }

    __jsonObjectHandler(data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            return data;
        }
    }

    __renderLastHtmlTemplate() {
        if (this.__settings.lastHtml) {
            this.__$appendTo.append(this.__settings.lastHtml);
        }
    }

    __renderErrorHtmlTemplate() {
        if (this.__settings.errorHtml) {
            this.__$appendTo.append(this.__settings.errorHtml);
        }
    }

    __getInfo() {
        let obj = {
            counter: this.__counter,
            loading: this.__loading,
            done: this.__done,
            errors: this.__errors,
            isWindow: this.__isWindow,
            urlType: this.__urlType,
            scrollFromTop: this.__$window.scrollTop(),
            settings: {
                requestType: this.__settings.requestType,
                scrollThreshold: this.__settings.scrollThreshold,
                autoTrigger: this.__settings.autoTrigger,
                autoTriggerUntil: this.__settings.autoTriggerUntil
            }
        };
        if (this.__settings.cache) {
            obj.cache = this.__settings.cache;
            obj.cachedAmount = this.__cache.length;
            obj.reached = this.__reached() || this.__reachedStatus;
        }
        if (this.__settings.intervalCheck) {
            obj.intervalCheck = this.__settings.intervalCheck;
            obj.intervalTime = this.__settings.intervalTime;
        }
        return obj;
    }

    __responseHandler(data, urlConfig) {
        const parsedData = this.__jsonObjectHandler(data);
        if (parsedData) {
            const append = (template) => {
                this.__$appendTo.append(template);
                this.__reachedStatus = false;
            };
            if (this.__settings.cache) {
                this.__callbacks['response'](parsedData, append, urlConfig, this.__getInfo());
            } else {
                this.__callbacks['response'](parsedData, append, this.urlConfig, this.__getInfo());
            }
        } else if (!parsedData || ((typeof parsedData === 'object') && parsedData.hasOwnProperty('done') && parsedData.done)) {
            this.__done = true;
            this.__renderLastHtmlTemplate();
            this.__callbacks['last'](this.__getInfo());
        }
    }

    __autoTriggerUntilHanddler() {
        if (!this.__settings.autoTriggerUntil) {
            return true;
        }
        return this.__settings.autoTriggerUntil > this.__counter;
    }

    on(event, callback) {
        this.__callbacks[event] = callback;
    }

    __reached() {
        const windowHeight = this.__$window.height() - (this.__$container.offset().top - this.__$window.scrollTop());
        return windowHeight - this.__$container.height() + this.__settings.scrollThreshold + 1 > 0;
    }

    __intervalCheckScrollPosition() {
        if (this.__settings.autoTrigger) {
            setInterval(() => {
                if (this.__reached()) {
                    if (!this.__loading && !this.__done && this.__autoTriggerUntilHanddler()) {
                        this.__reachedStatus = true;
                        if (this.__settings.cache) {
                            this.__callbacks['reached'](this.urlConfig, this.__getInfo());
                        } else {
                            this.__loading = true;
                            this.__ajaxRequest(this.__urlConfig);
                        }
                    }
                }
            }, this.__settings.intervalTime);
        }
    }

    __bindEventListeners() {
        if (this.__settings.autoTrigger) {
            this.__$window.on('scroll touchmove', () => {
                if (this.__reached()) {
                    if (!this.__loading && !this.__done && this.__autoTriggerUntilHanddler()) {
                        this.__reachedStatus = true;
                        if (this.__settings.cache) {
                            this.__callbacks['reached'](this.urlConfig, this.__getInfo());
                        } else {
                            this.__loading = true;
                            this.__ajaxRequest(this.__urlConfig);
                        }
                    }
                }
            })
        }
        if (this.__settings.nextSelector) {
            this.__$container.on('click touch', this.__settings.nextSelector, () => {
                if (!this.__loading && !this.__done && this.__autoTriggerUntilHanddler()) {
                    if (this.__settings.cache) {
                        this.__callbacks['reached'](this.urlConfig, this.__getInfo());
                    } else {
                        this.__loading = true;
                        this.__ajaxRequest(this.__urlConfig);
                    }
                }
            });
        }
    }
}
