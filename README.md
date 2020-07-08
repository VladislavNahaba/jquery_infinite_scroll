# jquery_infinite_scroll
Infinite scroll based on jquery
# Documentation
        contstructor:
            container: text/selector - Селектор на контейнер, где будет отрабатывать infinite-scroll.
            urlConfig: 
                url: text - url for requests
                params: object - params for request. If you use GET request, params will translate in query.

            settings:
                scrollThreshold: integer - Sets the distance between the viewport to scroll area
                appendTo: text/selector - Set container to append your template.
                lastHtml: text - html, that will be shown if there is no more data from backend. This will trigger only if backend response is empty string, or object with key done: true.
                errorHtml: text - html, that will be shown after error. For exmaple, lost connection or backend errors.
                loader: text/selector - selector to your loader
                loadingHtml: html - html-loader, that will be rendered in time of request and deleted after.
                cache: boolean - cache data after response. If this option is 'on', you need to do some work manual: save data, and get data from data container.
                autoTrigger: boolean - значение, которое указывает если инфинит скролл будет автоматически делать загрузку данных по достижению конца контейнера. Если указан false, то должен быть указан nextSelector
                nextSelector: text/selector - Set selector for element. After clicking this element there will be new ajax request for data.
                autoTriggerUntil: integer - You can set maximum value of request to backend
                requestType: text - Type of request. Can be only GET, POST.

        methods:
            init(): - initialize infinite-scroll
            on(callbackName, func): - callbacks from instance of Infinite Scroll class.
                init() - after inizialization of infinite-scroll
                response(data, append, urlConfig, info) - after getting response from server.
                    data: - response data
                    append(template): function - Append your template to container with this function.
                    urlConfig: object - url config object. You can change parameters of url config with this so they will change in instance of infinite scroll.
                    info: object - info about work
                error(error, workContinue, urlConfig, info) - work after error
                    error: - error data
                    workContinue: function - with this function you can handle errors and if this error was fixed(for example, lost connection), you can continue work of infinite scroll
                    urlConfig: object - url config object. You can change parameters of url config with this so they will change in instance of infinite scroll.
                    info: object - info about work
                last(info) - work when server response is empty string or object with key done:true
                     info: object - info about work
                     
        # Methods if cache is enabled.
                clearCache(): - clear all cached data.
                getFromCache(index): - get data from cache. Get index as parameter. After getting from cache data in storage is removed.
                saveInCache(data): - store data in cache storage.
                makeAjax(urlConfig): - make ajax request to server. Get as params urlConfig
                append(template): function - Append your template to container with this function.
# Example


        const infinite = new InfiniteScroll(
            '#infinite',
            {
                url: URL_FOR_REQUESTS'
            },
            {
                scrollThreshold: 50,
                lastHtml: '<div class="text-center">last ads</div>',
                errorHtml: '<div class="text-center">Error</div>',
                loadingHtml: '<span class="loader"></span>',
                requestType: 'get'
            }
        );

        infinite.on('init', () => {
            console.log('initialization');
        });

        infinite.on('response', (data, append, urlConfig, info) => {
            let template = '';
            data.forEach(el => {
            template += `<div class="infinite-block">
            <img class="infinite-block-image" src="example.png" />
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

# Example with cached data


    const infinite = new InfiniteScroll(
        '#infinite',
        {
            url: URL_FOR_REQUESTS
        },
        {
            scrollThreshold: 0,
            cache: true,
            intervalCheck: true,
            lastHtml: '<div class="text-center">Last ads</div>',
            errorHtml: '<div class="text-center">Error</div>',
            requestType: 'post'
        }
    );
    
    function formTemplate(data) {
        let template = '';
        data.forEach(el => {
        template += `
            <div class="infinite-block">
                <img class="infinite-block-image" src="exmaple.png" />
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
        return template;
    }

    let skip = 0;
    const cashedAmount = 3;
    
    infinite.on('init', (urlConfig) => {
        // We make 3 request to server to cache first 3 responses
        const obj = {};
        obj.url = urlConfig.url;
        if (!urlConfig.hasOwnProperty('params')) {
            obj.params = {}
        }
        for (let i = 0; i < cashedAmount; i++) {
            obj.params.skip = ++skip;
            infinite.makeAjax(obj);
        }
    });
   
    
    infinite.on('response', (data, append, urlConfig, info) => {
        infinite.saveInCache(data);
    });
    
    infinite.on('reached', (urlConfig, info) => {
        if (info.cachedAmount !== 0) {
            // we check if we have data in cache. If we do, we render this data.
            const data = infinite.getFromCache(0);
            infinite.append(formTemplate(data));
        }
        // We translate in init just clone of urlConfig, so we need to create again 'skip' property
        if (!urlConfig.hasOwnProperty('params')) {
            urlConfig.params = {}
            urlConfig.params.skip = skip;
        }
        // after render we make new request to server to get new cached data
        if (!info.done) {
            urlConfig.params.skip++;
            infinite.makeAjax(urlConfig);
        }
    });
    
    infinite.on("error", (error, workContinue, urlConfig, info) => {
        console.log(error);
    });
    
    infinite.on("last", (info) => {
        console.log(info);
    });
    infinite.init();
