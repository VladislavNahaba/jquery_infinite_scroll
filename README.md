# jquery_infinite_scroll
Infinite scroll based on jquery
# Documentation
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
#Example
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
