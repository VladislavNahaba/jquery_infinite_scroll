class InfiniteScroll {

    /*

    DOCS
        contstructor:
            container: text - Селектор на контейнер, где будет отрабатывать infinite-scroll.
            urlConfig: 
                url: text - урл, куда будут идти запросы
                params: object - обьект с параметрами для запроса. При GET запросе параметры будут представлены в виде строки в урле(работает только с обьектом 1 вложенности).

            settings:
                scrollThreshold: integer - Отступ до конца контейнера перед тем, как начнется запрос
                appendTo: selector - В каком элементе в контейнере рендерить данные
                lastHtml: text - html, который будет вставлен в конец контейнера после того, как autoTriggerUntil сработает
                errorHtml: text - html, который будет вставлен в конец контейнера после того, как запрос выдаст ошибку
                loader: selector - селектор до лоадера
                loadingHtml: html - html-loader, который будет вставлен во время запроса и удален по его завершению
                autoTrigger: boolean - значение, которое указывает если инфинит скролл будет автоматически делать загрузку данных по достижению конца контейнера. Если указан false, то должен быть указан nextSelector
                nextSelector: selector - указывает на элемент, по клику на который будет сделан запрос и подгружены новые записи
                autoTriggerUntil: integer - ограничение по кол-ву подгруженных записей.
                requestType: text - Тип запроса на бэк. Принимает два параметра: GET, POST

        methods:
            init: - инициализация infinite-scroll
            on:
                init() - срабатывает во время инициализации infinite-scroll
                response(data, append, urlConfig, info) - срабатывает после полученич данных с бэкэнда
                    data: - данные с бэкэнда
                    append(template): function - функция, которая отрендерит шаблон в конец контейнера. Принимает как параметр шаблон
                    urlConfig: object - параметры инициализации urlConfig. Вы можете изменить их. Например, изменить урл или параметры.
                    info: object - информация о работе infinite-scroll
                error(error, workContinue, urlConfig, info) - срабатыват после ошибки запроса
                    error: - информация об ошибке
                    workContinue: function - заставляет инфинит-скролл работать дальше. Необходимо пофиксить ошибку и удалить errorHtml, если он был указан
                    urlConfig: object - параметры инициализации urlConfig. Вы можете изменить их. Например, изменить урл или параметры.
                    info: object - информация о работе infinite-scroll
                last(info) - срабатывает во время последней записи
                     info: object - информация о работе infinite-scroll

    */

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
            nextSelector: null,
            autoTriggerUntil: null,
            requestType: 'get'
        };
        
        this.__settings = Object.assign(defaultValues, settings);
        this.__contructorValuesCheck(container, urlConfig, this.__settings);
        
        this.__$container = this.__initSelector(container);
        this.__$appendTo = this.__settings.appendTo ? this.__$container.find(this.__settings.appendTo) : this.__$container;
        this.__urlConfig = urlConfig;

        this.__isWindow = (this.__$container.css('overflow-y') === 'visible');

        this.__loading = false;
        this.__done = false;
        this.__errors = [];
        this.__counter = 0;
        this.__callbacks = {
            'init': () => {},
            'response': () => {},
            'error': () => {},
            'last': () => {}
        };

        this.__$window = $(window);
        this.__$scroll = this.__isWindow ? this.__$window : this.__$container;
        this.__$body = $('body');
    }

    get urlConfig() {
        return this.__urlConfig;
    }

    set urlConfig(urlConfig) {
        this.__urlConfig = urlConfig;
    }

    init() {
        this.__bindEventListeners();
        this.__callbacks['init']();
    }

    __contructorValuesCheck(container, urlConfig, settings) {
        if (!window.jQuery) {
            throw new Error('Constructor error: jQuery is not loaded');
        }
        if (!container) {
            throw new Error('Constructor error: container is not specified');
        }
        if (!urlConfig) {
            throw new Error('Constructor error: urlConfig is not specified');
        }
        if (!urlConfig.url) {
            throw new Error('Constructor error: urlConfig.url is not specified');
        }
        if (!Number.isInteger(settings.scrollThreshold)) {
            throw new Error('Constructor error: scrollThreshold must be a integer');
        }
        if (!settings.autoTrigger && !settings.nextSelector) {
            throw new Error('Constructor error: AutoTrigger set to false, but nextSelector is not defined');
        }
        if (settings.autoTriggerUntil !== null && !Number.isInteger(settings.autoTriggerUntil)) {
            throw new Error('Constructor error: autoTriggerUntil must be a integer');
        }
        if (settings.autoTriggerUntil !== null && settings.autoTriggerUntil < 0) {
            throw new Error('Constructor error: autoTriggerUntil can\'t be less than 0');
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
        const urlType = this.__checkUrlType(this.urlConfig.url) ? 'absolute' : 'relative';
        if (urlType === 'absolute') {
            urlObject = new URL(url);
        } else if (urlType === 'relative') {
            urlObject = new URL(url, document.location.protocol + '//' + document.location.host + '/');
        } 

        if (typeof params === 'object') {
            for (const [key, value] of Object.entries(params)) {
                urlObject.searchParams.set(key, value);
            }
        }
        return urlObject.toString();
    }

    __ajaxRequest() {
        this.__showLoader();
        if (this.__settings.requestType.toLowerCase() === 'get') {
            $.ajax({
                url: this.urlConfig.params
                ? this.__getSafeParams(this.urlConfig.url, this.urlConfig.params)
                : this.urlConfig.url,
                type: 'GET',
                success: (data, status) => { 
                    this.__successResponse(data, status);
                },
                error: (error) => {
                    this.__errorResponse(error);
                }
            });
        } else if (this.__settings.requestType.toLowerCase() === 'post') {
            $.ajax({
                url: this.urlConfig.url,
                type: 'POST',
                data: this.urlConfig.params,
                success: (data, status) => { 
                    this.__successResponse(data, status);
                },
                error: (error) => {
                    this.__errorResponse(error);
                }
            });
        }
    }

    __successResponse(data) {
        this.__counter++;
        this.__loading = false;
        this.__hideLoader();
        this.__responseHandler(data);
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
            this.__ajaxRequest();
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
        return {
            counter: this.__counter,
            loading: this.__loading,
            done: this.__done,
            errors: this.__errors,
            isWindow: this.__isWindow,
            settings: {
                requestType: this.__settings.requestType,
                scrollThreshold: this.__settings.scrollThreshold,
                autoTrigger: this.__settings.autoTrigger,
                autoTriggerUntil: this.__settings.autoTriggerUntil
            }
        }
    }

    __responseHandler(data) {
        const parsedData = this.__jsonObjectHandler(data);
        if (parsedData) {
            const append = (template) => {
                this.__$appendTo.append(template);
            };
            this.__callbacks['response'](parsedData, append, this.urlConfig, this.__getInfo());
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

    __bindEventListeners() {
        if (this.__settings.autoTrigger) {
            this.__$window.on('scroll', () => {
                let windowHEight = this.__$window.height() - (this.__$container.offset().top - this.__$window.scrollTop());
                if (windowHEight - this.__$container.height() - this.__$container.scrollTop() + this.__settings.scrollThreshold + 1 > 0) {
                    if (!this.__loading && !this.__done && this.__autoTriggerUntilHanddler()) {
                        this.__loading = true;
                        this.__ajaxRequest();
                    }
                }
            })
        }
        if (this.__settings.nextSelector) {
            this.__$container.on('click touch', this.__settings.nextSelector, () => {
                if (!this.__loading && !this.__done && this.__autoTriggerUntilHanddler()) {
                    this.__loading = true;
                    this.__ajaxRequest();
                }
            });
        }
    }
}

// Example

const infinite = new InfiniteScroll(
    '#infinite',
    {
        url: 'http://localhost:3000/get'
    },
    {
        scrollThreshold: 50,
        lastHtml: '<div class="text-center">Последняя запись</div>',
        errorHtml: '<div class="text-center">Ошибка</div>',
        loadingHtml: '<span class="loader"></span>',
        requestType: 'post'
    }
);

infinite.on('init', () => {
    console.log('initialization');
});

infinite.on('response', (data, append, urlConfig, info) => {
    let template = '';
    data.forEach(el => {
    template += `<div class="infinite-block">
    <img class="infinite-block-image" src="https://i.simpalsmedia.com/999.md/BoardImages/160x120/5523a6bc1a74282e3985ecaedb3eb924.jpg" />
        <div class="infinite-block-title">
            ${el.title}
        </div>
        <div class="infinite-block-info">
            ${el.year} / ${el.km}
        </div>
        <div class="infinite-block-price">
            ${el.price}
        </div>
    </div>`
    });
    append(template);
});

infinite.on("error", (error, workContinue, urlConfig, info) => {
    console.log(error);
});

infinite.on("last", (info) => {
    console.log(info);
});
infinite.init();