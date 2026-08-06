# Зміни в employer-api.robota.ua у зв'язку з додаванням нового типу резюме.docx

> Джерело: Зміни в employer-api.robota.ua у зв'язку з додаванням нового типу резюме.docx (від robota.ua/work.ua). Збережено як довідка.

Ми запустили новий тип резюме для пошукачів — резюме-файлом. Це дає можливість пошукачу зберігати у профілі завантажене резюме (PDF/DOC) без необхідності створювати проф-резюме на платформі.
Цінність для пошукача — можливість мати у профілі актуальне резюме-файлом.
Цінність для роботодавця — збільшення кількості резюме в СВДБ та ширший доступ до кандидатів.
Резюме-файлом має окрему позначку “Файл”, містить коротку інформацію, яку пошукач вказує при створенні (контакти, місто, посада та ін.).
Зміни в API
Для підтримки нового типу резюме внесено оновлення до роботи employer-api.
Отримання списку відгуків (/apply/list)
Для резюме-файлом у відповіді буде повертатися додаткове поле resumeFile, яке міститиме короткий опис резюме.
 Усі інші поля у відповіді виглядають так само, як і для звичайного проф-резюме.
 Тип резюме в полі resumeType залишається зі значенням "Notepad".
Перегляд відгуку (/apply/view/{id})
Структура відповіді не змінюється.
Відгук з резюме-файлом виглядатиме так само, як і звичайне проф-резюме. Тип резюме в полі resumeType повертається як "Notepad".
Отримання файлу резюме (/apply/getfile/{id})
Для скачування файлу нового типу резюме необхідно передати тип резюме "Notepad".
 У відповідь буде повернуто файл, який пошукач додав при створенні резюме-файлом.
Поточна логіка для інших типів резюме не змінюється.
English version of the document
We have launched a new type of resume for job seekers — a file-based resume. It allows job seekers to upload and store their resume (PDF/DOC) in their profile without needing to create a platform-native profile resume.
The value for job seekers is the ability to keep an up-to-date resume file in their profile.
 The value for employers is an increased number of resumes in the database and broader access to candidates.
A file-based resume is marked with a separate “File” label and includes brief information provided by the job seeker during upload (contact details, city, position, etc.).
API changes
To support the new resume type, updates have been made to the employer API.
Fetching application list (/apply/list)
For file-based resumes, the response will include an additional field resumeFile, which contains a short description of the resume.
All other fields in the response remain the same as for a standard profile resume.
 The resume type in the resumeType field remains set to "Notepad".
Viewing an application (/apply/view/{id})
The response structure remains unchanged.
 An application with a file-based resume will look the same as a standard profile resume. The resume type in the resumeType field is returned as "Notepad".
Downloading the resume file (/apply/getfile/{id})
To download the file for the new resume type, you need to pass the resume type "Notepad".
 The response will return the file that the job seeker uploaded when creating the file-based resume.
The existing logic for other resume types remains unchanged.
