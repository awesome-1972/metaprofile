# API robota.ua.docx

API документація для можливості роботи із сайтом за допомогою сторонніх програм.
Зміст
1. Авторизація
2. Вакансії
3. Відгуки
Авторизація
Авторизація виконується на сторінці API :  https://auth-api.robota.ua
Використовуємо метод  POST /Login
Використовуємо модель для входу, куди вводимо дані про користувача:
{
  "username": "user@example.com",
  "password": "string",
  "remember": true
}
username - логін
password - пароль
Для виконання запитів на https://employer-api.robota.ua необхідно в заголовках запиту надсилати також заголовок Authorization зі значенням Bearer <token>
<token> - токен, отриманий в результаті Авторизації
Вакансії
Для створення та редагування вакансії використовуємо: https://employer-api.robota.ua.
POST /vacancy/add – ендпоінт для створення та редагування вакансії. Для створення необхідно передавати ID = 0, для редагування – вказувати явно у полі ID ідентифікатор існуючої вакансії.
POST /vacancy/state/{id} - ендпоінт використовується для зміни статусу вакансії (Опубліковано, Чернетка, Завершено, Видалено… і тд).
Для зміни статусу вакансії необхідно в урлі після id вакансії передавати статус стрінгою
curl -X POST "https://employer-api.robota.ua/vacancy/state/vacancyId?state=string"
Deleted – Видалити вакансію
Closed – Завершити вакансію
Publicated – Опублікувати вакансію
NotPublicated – Чернетка.
 POST /vacancy/list - ендпоінт який дозволяє отримати список вакансій, які є в обліковому записі та їх id
У параметрах методу можна фільтрувати вибірку вакансій:
по сторінці видачі – параметр "page"
за статусом вакансій (Опубліковано, Завершено, Чернетка тощо) – це параметр "vacancyStateId". Типи статусів вакансій можна отримати за допомогою ендпоінту GET /values/vacancy/state
по регіону – параметр "cityId". ID населених пунктів можна отримати за допомогою ендпоінту GET /values/citylist
за типом публікації (Бізнес, Оптимум, Проф, Анонімна - "Business", "Optimum", "Professional", "Anonym".) - це параметр "vacancyTypeId". Типи публікацій та їх id можна отримати за допомогою ендпоінту GET /values/vacancy/publicationtype
за назвою – це параметр "vacancyName"
GET /vacancy/get/{id} - ендпоінт який дозволяє отримати зміст вакансії, підставляючи замість букв "id" значення id вакансії.
Відгуки
Для роботи з відгуками використовуємо: https://employer-api.robota.ua
POST /apply/list - ендпоінт отримання списку відгуків.
Використовуємо модель, куди вводимо дані:
{ 
"vacancyId": int,
"folderId": int,
"page": int,
"filter": "string"
}
“vacancyId” - цей параметр  дозволяє отримати відгуки за конкретною вакансією або отримати усі відгуки облікового запису:
значення “0” – повертає всі відгуки облікового запису(разом із збереженими резюме з бази резюме)
значення “ID конкретної вакансії” – видасть відгуки щодо цієї конкретної вакансії.
“folderId” - цей параметр дозволяє фільтрувати відгуки за статусами:
значення  “0” - повертає всі відгуки, незалежно від їх статусу
значення  “1” – повертає відгуки зі статусом Непереглянутий,
значення  “2” – повертає відгуки зі статусом Переглянутий,
значення  “3” – повертає відгуки зі статусом Цікавий,
значення  “4” - повертає відгуки зі статусом Подумати,
значення  “5” - повертає відгуки зі статусом Нецікавий,
значення  “6” - повертає відгуки зі статусом Запрошений,
значення  “7” - повертає відгуки зі статусом Відмовлено
значення “10” - повертає відгуки зі статусом Найнятий
“page” – параметр пагінації списку відгуків (до 20 відгуків на сторінку):
зі значенням “0” - повертає першу сторінку списку результатів
зі значенням “1” - повертає другу сторінку списку результатів
і т.д..
"filter" - це пошук по відгукам. Шукає по співпадінню ключового слова чи за номером телефону. *Він не шукає у змісті відгуку, який здійснено пошукачем за допомогою власного файлу з резюме.
POST /apply/view/{id} - ендпоінт перегляду відгуку
Вводимо дані:
"id" (path): int.
"resumeType" (query): "string".
id – id відгуку.
resumeType (тип резюме): 
1 – відгук прикріпленим файлом («AttachedFile»), 
2 – резюме створене на сайті («Notepad»), 
3 – збережені з бази резюме («Selected»), 
4 – відгук без резюме («NoCvApply»).
GET /apply/getfile/{id} - ендпоінт скачування файлу відгуків.
Вводимо дані:
"id" (path): int.
"resumeType" (query): "string".
id – id відгуку. Цей параметр обов'язковий
resumeType (тип резюме): 
1 – відгук прикріпленим файлом пошука («AttachedFile»), 
2 – резюме створене на сайті («Notepad»), 
3 – збережені з бази резюме («Selected»),
 4 – відгук без резюме («NoCvApply»). 

*Параметри id та resumeType обов'язкові до вказівки при використанні методу завантаження файлів резюме з відгуків
English Documentation
API documentation for the ability to work with the site through third-party programs.
Content
Login
Vacancy
Apply
Login
Authorization is performed on the API page: https://auth-api.robota.ua
Use POST /Login  endpoint
Use the model to enter, where enter user information:
{
  "username": "user@example.com",
  "password": "string",
  "remember": true
}
You must send token in the Authorization header when making requests to https://employer-api.robota.ua (example: Authorization: Bearer <token>)
<token> - token received as a result of POST /Login
Vacancy
For create and edit a vacancy need use -  https://employer-api.robota.ua.
POST /vacancy/add – this endpoint for creating and editing vacancy. For creation, it is necessary to transfer ID = 0, for editing, specify explicitly the identifier of an existing vacancy in the ID field.
POST /vacancy/state/{id} - use to change vacancy status (Publicated, Draft, Closed, Deleted … etc).
For change the status of a vacancy, it is necessary to post the string status in the url after the id of the vacancy
curl -X POST "https://employer-api.robota.ua/vacancy/state/ vacancyId?state=string"
Deleted – Delete a vacancy
Closed – Close a vacancy
Publicated – Publicate a vacancy
NotPublicated – Draft
Apply
For work with applies need use - https://employer-api.robota.ua
POST /apply/list  - getting a list of applies on vacancy
Use the model where enter the data:
{
 "vacancyId": int,
  "folderId": int,
  "page": int,
  "filter": "string"
}
“vacancyId” - this parameter allows you to retrieve applications for a specific vacancy or all applications for an account:
value “0” – returns all applications for the account.
value "vacancy ID" – returns applications received for that vacancy.
“folderId” - this parameter allows you to filter applications by status:
value “0” – returns all applications, regardless of their status.
value “1” – returns applications with the status "Unviewed".
value “2” – returns applications with the status "Viewed".
value “3” – returns applications with the status "Interesting".
value “4” – returns applications with the status "Consider".
value “5” – returns applications with the status "Uninteresting".
value “6” – returns applications with the status "Invited".
value “7” – returns applications with the status "Rejected".
“page” - parameter for paginating the list of applications (up to 20 applications per page):
value “0” – returns the first page of the results list.
value “1” – returns the second page of the results list.
Etc...
“Filter” - this is a search through the applications. It searches by keyword match or by phone number. *It does not search within the application content that the applicant submitted using their own resume file.
POST /apply/view/{id} - view apply
Enter data:
"id" (path): int.
"resumeType" (query): "string".
id – id of the application.
resumeType (type of a cv): 
1 – application via attached file  («AttachedFile»), 
2 – application via resume created on our website («Notepad»), 
3 – saved cv from CVDB («Selected»), 
4 – application without CV(by phone) («NoCvApply»).
GET /apply/getfile/{id} - application download
Enter data:
"id" (path): int.
"resumeType" (query): "string".
id – id of the application.
resumeType (type of a cv): 
1 – application via attached file («AttachedFile»), 
2 – application via resume created on our website («Notepad»), 
3 – saved cv from CVDB («Selected»), 
4 – application without CV(by phone) («NoCvApply»). 

*The id and resumeType parameters are required when using the method of downloading resume files from applications
                          Документация на русском языке
API документация для возможности работы с сайтом посредством сторонних программ.
Содержание
Авторизация
Вакансии
Отклики
Авторизация
Авторизация выполняется на странице API :  https://auth-api.robota.ua
Используем endpoint POST /Login
Используем модель для входа, куда вводим данные о пользователе:
{
  "username": "user@example.com",
  "password": "string",
  "remember": true
}
username - логин
password - пароль
Для выполнения запросов на https://employer-api.robota.ua необходимо в заголовках запроса отправлять также заголовок Authorization со значением Bearer <token>
<token> - токен, полученный в результате Авторизации
Вакансии
Для создания и редактирования вакансии  используем: https://employer-api.robota.ua.
POST /vacancy/add – эндпоинт для создания и редактирования вакансии. Для создания необходимо передавать ID = 0, для редактирования - указывать явно в поле ID идентификатор существующей  вакансии.
POST /vacancy/state/{id} - Используется для изменения статуса вакансии (Опубликована, Черновик, Завершена, Удалена … и тд).
Для изменения статуса вакансии необходимо в урле после id вакансии передавать статус стрингой
curl -X POST "https://employer-api.robota.ua/vacancy/state/ vacancyId?state=string"
Deleted – Удалить вакансию
Closed – Закрыть вакансию
Publicated – Опубликовать вакансию
NotPublicated – Черновик.
Отклики
Для работы с откликами  используем: https://employer-api.robota.ua
POST /apply/list - получение списка всех откликов
Используем модель, куда вводим данные:
{
  "vacancyId": int,
  "folderId": int,
  "page": int,
  "filter": "string"
}
“vacancyId” - этот параметр позволяет получить отклики по конкретной вакансии или получить все отклики учетной записи:
значение "0” – возвращает все отклики учетной записи
значение “ID вакансии” – возвращает отклики полученные по этой вакансии
“folderId” - этот параметр позволяет фильтровать отклики по статусам:
значение  “0” - возвращает все отклики, независимо от их статуса
значение  “1” – возвращает отклики со статусом Непросмотренный,
значение  “2” – возвращает отклики со статусом Просмотренный,
значение  “3” – возвращает отклики со статусом Интересный,
значение  “4” - возвращает отклики со статусом Подумать,
значение  “5” - возвращает отклики со статусом Неинтересный,
значение  “6” - возвращает отклики со статусом Приглашенный,
значение  “7” - возвращает отклики со статусом Отказано
“page” – параметр пагинации списка откликов (до 20 откликов на страницу):
со  значением “0” - возвращает первую страницу списка результатов
со  значением “1” - возвращает вторую страницу списка результатов
И т.д...
"filter" - это поиск по откликам . Ищет по совпадению ключевого слова или по телефону. *Он не ищет в содержании отклика, который осуществлен соискателем с помощью собственного файла с резюме.
POST /apply/view/{id} - просмотр отклика
Вводим данные:
"id" (path): int.
"resumeType" (query): "string".
id – id отклика.
resumeType (тип резюме): 1 – отклик прикрепленным файлом («AttachedFile»), 2 –резюме созданное на сайте («Notepad»), 3 – сохраненные из базы резюме («Selected»), 4 – отклик без резюме («NoCvApply»).
GET /apply/getfile/{id} - скачивание откликов.
Вводим данные:
"id" (path): int.
"resumeType" (query): "string".
id – id отклика.
resumeType (тип резюме): 
1 – отклик прикрепленным файлом («AttachedFile»), 
2 –резюме созданное на сайте («Notepad»), 
3 – сохраненные из базы резюме («Selected»), 
4 – отклик без резюме («NoCvApply»). 

*Параметры id и resumeType обязательны к указанию при использовании метода загрузки файлов резюме из откликов
