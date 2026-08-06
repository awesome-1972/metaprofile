# Оновлення функціоналу фільтрації кандидатів.docx

Оновлення функціоналу фільтрації кандидатів
Додано можливість фільтрувати кандидатів за їхнім типом.
Це дозволяє більш гнучко налаштовувати вибірку кандидатів під конкретні потреби.
Як це працює:
Тепер у запиті можна передавати параметр candidateTypes, де вказуються потрібні типи кандидатів.

 Приклад запиту:
{
  "vacancyId": 0,
  "folderId": 0,
  "page": 0,
  "filter": "",
  "candidateTypes": [
    "ApplicationWithResume",
    "VacancyInteraction"
  ]
}
Доступні типи кандидатів:
Application
ApplicationWithResume
ApplicationWithFile
SelectedResume
VacancyInteraction
Recommended
VacancyOffered
Поле candidateTypes наразі виключено зі схеми, але його можна 
передавати вручну у запиті.
Додаткові зміни:
Для типів Recommended, VacancyInteraction та VacancyOffered тепер відбувається автоматичне перетворення ідентифікаторів з формату GUID у INT.
Логіка роботи (пріоритет умов):
Якщо передати candidateTypes — повернуться кандидати лише зазначених типів
Якщо не передавати жодне з цих полів, у результат додатково потраплять кандидати типу VacancyInteraction разом зі стандартними типами (Application, ApplicationWithFile, ApplicationWithResume, SelectedResume).
Приклад по вакансії:
Якщо запит без додаткової фільтрації (те як по замовчуванню було нашатовано) то у відповіді отримуємо 572 кандидата (всі 100% що є на сайті)
Якщо в запити додали фільтрацію по типам кандитатів - можемо обирати кого вигружати, на скріні нижче обрано лише перша і третя вкладки (без збережних), таким чином роботодавець може самостійно в АПІ керувати кого яких кандидатів імпортувати.
English version of the document
Candidate Filtering Functionality Update
The ability to filter candidates by their type has been added.
This allows for more flexible candidate selection tailored to specific business needs.
How it works
You can now pass the candidateTypes parameter in the request and specify the required candidate types.
Example request:
{
  "vacancyId": 0,
  "folderId": 0,
  "page": 0,
  "filter": "",
  "candidateTypes": [
    "ApplicationWithResume",
    "VacancyInteraction"
  ]
}
Available candidate types
Application
ApplicationWithResume
ApplicationWithFile
SelectedResume
VacancyInteraction
Recommended
VacancyOffered
The candidateTypes field is currently excluded from the schema, but it can still be passed manually in the request.
Additional changes
For the following candidate types:
Recommended
VacancyInteraction
VacancyOffered
identifier conversion from GUID to INT is now performed automatically.
Processing logic (priority rules)
If candidateTypes is provided, only candidates of the specified types will be returned.
If none of these fields are provided, the response will additionally include candidates of type VacancyInteraction together with the standard candidate types:
Application
ApplicationWithFile
ApplicationWithResume
SelectedResume
Vacancy example
If the request is sent without additional filtering (the default behavior), the response will contain 572 candidates — representing 100% of the candidates available on the website.
If candidate type filtering is added to the request, you can choose which candidates should be exported. In the example shown in the screenshot below, only the first and third tabs are selected (excluding saved candidates).
