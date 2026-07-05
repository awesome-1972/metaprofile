// src/lib/ats/brief-questions.ts
//
// Структура бріф-опитувальника клієнта (Додаток C, docs/requirements/ats-agency-features.md).
// Джерело: «Запитання до Клієнта з приводу вакансії» (Google Form власника) —
// тексти питань перенесені ДОСЛІВНО з форми (зняті 2026-07-05), 15 секцій.
//
// ВАЖЛИВО: фінансово-чутливі питання (компенсація/бонуси) позначені `financial: true` і
// НЕ повинні потрапляти у vacancy_briefs.answers — форма (BriefTab) записує їх окремо у
// vacancy_brief_financials.answers (RLS-гейт mp_can_view_vacancy_financials).

export type BriefQuestionType = "text" | "textarea" | "radio";

export interface BriefQuestion {
  key: string;
  label: string;
  type: BriefQuestionType;
  options?: string[];
  financial?: boolean;
}

export interface BriefSection {
  sectionKey: string;
  title: string;
  questions: BriefQuestion[];
}

/** Секція «Умови» — містить фінансові питання (BriefTab рендерить для неї фін-блок). */
export const CONDITIONS_SECTION_KEY = "conditions";

export const BRIEF_SECTIONS: BriefSection[] = [
  {
    sectionKey: "intro",
    title: "Загальні дані",
    questions: [
      { key: "company_legal_name", label: "Юридична назва Вашої компанії", type: "text" },
      { key: "position_title", label: "Назва посади", type: "textarea" },
    ],
  },
  {
    sectionKey: "business_strategy",
    title: "1. Бізнес та стратегія",
    questions: [
      { key: "growth_stage", label: "1. Розкажіть коротко про поточний етап розвитку компанії, будь ласка.", type: "textarea" },
      { key: "goals_1_3_years", label: "2. Які стратегічні цілі компанії на найближчі 1-3 роки?", type: "textarea" },
      { key: "key_challenges", label: "3. Які ключові виклики стоять перед бізнесом сьогодні?", type: "textarea" },
      { key: "changes_ma", label: "4. Які зміни відбуваються або плануються в компанії (зростання, трансформація, реструктуризація, вихід на нові ринки, M&A тощо)?", type: "textarea" },
      { key: "role_in_strategy", label: "5. Яку роль має відігравати ця людина та функція, де людина буде працювати, в реалізації стратегії компанії?", type: "textarea" },
    ],
  },
  {
    sectionKey: "opening_reason",
    title: "2. Причини відкриття вакансії",
    questions: [
      {
        key: "opening_reason_type",
        label: "6. Чому виникла вакансія?",
        type: "radio",
        options: ["Нова роль", "Заміна", "Розширення функції", "Реорганізація", "Інше"],
      },
      { key: "replacement_who", label: "7а. Якщо це заміна: хто обіймав посаду раніше?", type: "textarea" },
      { key: "replacement_tenure", label: "7б. Як довго працювала людина?", type: "textarea" },
      { key: "replacement_strengths", label: "7в. Що було її сильними сторонами?", type: "textarea" },
      { key: "replacement_results", label: "7г. Яких результатів досягла?", type: "textarea" },
      { key: "replacement_failures", label: "7д. З якими завданнями не впоралася?", type: "textarea" },
      { key: "replacement_keep_change", label: "7е. Що ви хотіли б зберегти, а що змінити в новому кандидатові?", type: "textarea" },
      { key: "no_internal_candidates", label: "7є. Чому немає внутрішніх кандидатів на цю посаду?", type: "textarea" },
    ],
  },
  {
    sectionKey: "role",
    title: "3. Роль",
    questions: [
      { key: "main_result", label: "8. Який головний результат має створювати людина на цій ролі?", type: "textarea" },
      { key: "success_in_year", label: "9. Якщо через рік ми визнаємо пошук успішним, що буде свідчити про успіх?", type: "textarea" },
    ],
  },
  {
    sectionKey: "responsibilities",
    title: "4. Функціонал та відповідальність",
    questions: [
      { key: "responsibility_zones", label: "10. Основні зони відповідальності.", type: "textarea" },
      { key: "independent_decisions", label: "11. Які рішення людина ухвалює самостійно?", type: "textarea" },
      { key: "approval_decisions", label: "12. Які рішення потребують погодження?", type: "textarea" },
      { key: "planned_projects", label: "13. Які проєкти або трансформації вже заплановані?", type: "textarea" },
      { key: "time_allocation", label: "14. Які завдання займають найбільшу частину часу?", type: "textarea" },
    ],
  },
  {
    sectionKey: "expected_results",
    title: "5. Очікувані результати",
    questions: [
      { key: "results_30d", label: "15. Що людина має зробити протягом перших 30 днів?", type: "textarea" },
      { key: "results_90d", label: "16. Що людина має зробити протягом перших 90 днів?", type: "textarea" },
      { key: "results_6m", label: "17. Що людина має зробити протягом перших 6 місяців?", type: "textarea" },
      { key: "results_12m", label: "18. Що людина має зробити протягом перших 12 місяців?", type: "textarea" },
      { key: "kpi_criteria", label: "19. Які KPI або критерії оцінки ефективності застосовуються?", type: "textarea" },
      { key: "critical_results", label: "20. Які результати є критично важливими?", type: "textarea" },
    ],
  },
  {
    sectionKey: "org_context",
    title: "6. Організаційний контекст",
    questions: [
      { key: "reports_to", label: "21. Кому підпорядковується посада?", type: "textarea" },
      { key: "internal_stakeholders", label: "22. Хто є ключовими внутрішніми стейкхолдерами?", type: "textarea" },
      { key: "external_stakeholders", label: "23. Хто є зовнішніми стейкхолдерами?", type: "textarea" },
      { key: "closest_functions", label: "24. З якими функціями потрібна найбільш тісна взаємодія?", type: "textarea" },
      { key: "matrix_reporting", label: "25. Чи є матричне підпорядкування?", type: "radio", options: ["Так", "Ні"] },
    ],
  },
  {
    sectionKey: "team",
    title: "7. Команда",
    questions: [
      { key: "team_structure", label: "26. Яка структура команди?", type: "textarea" },
      { key: "direct_reports", label: "27. Скільки прямих підлеглих?", type: "text" },
      { key: "indirect_reports", label: "28. Скільки непрямих підлеглих?", type: "text" },
      { key: "team_maturity", label: "29. Який рівень зрілості команди?", type: "textarea" },
      { key: "team_strengths", label: "30. Які сильні сторони команди?", type: "textarea" },
      { key: "team_gaps", label: "31. Які проблеми або прогалини існують сьогодні?", type: "textarea" },
      { key: "team_replaceable", label: "32. Чи можна змінювати членів команди, які не надають очікуваний результат?", type: "textarea" },
    ],
  },
  {
    sectionKey: "candidate_profile",
    title: "8. Профіль кандидата",
    questions: [
      { key: "must_have_competencies", label: "33. Які професійні компетенції є обов'язковими?", type: "textarea" },
      { key: "nice_to_have_competencies", label: "34. Які компетенції бажані?", type: "textarea" },
      { key: "critical_experience", label: "35. Який досвід є критичним?", type: "textarea" },
      { key: "advantage_experience", label: "36. Який досвід буде перевагою?", type: "textarea" },
      { key: "certifications", label: "37. Які знання або сертифікації важливі?", type: "textarea" },
      {
        key: "english_level",
        label: "38. Який рівень англійської мови потрібен?",
        type: "radio",
        options: ["А1", "А2", "В1", "В2", "С1", "Не важливо"],
      },
    ],
  },
  {
    sectionKey: "leadership_personality",
    title: "9. Лідерські та особистісні компетенції",
    questions: [
      { key: "success_competencies", label: "39. Які ключові компетенції визначатимуть успіх на посаді?", type: "textarea" },
      { key: "critical_traits", label: "40. Які риси характеру є критичними?", type: "textarea" },
      { key: "effective_leadership", label: "41. Які стилі лідерства будуть ефективними?", type: "textarea" },
      { key: "ineffective_styles", label: "42. Які стилі поведінки не спрацюють у вашій культурі?", type: "textarea" },
    ],
  },
  {
    sectionKey: "culture_fit",
    title: "10. Культурна відповідність",
    questions: [
      { key: "culture_description", label: "43. Як ви описали б корпоративну культуру?", type: "textarea" },
      { key: "living_values", label: "44. Які цінності справді живуть у компанії?", type: "textarea" },
      { key: "rewarded_people", label: "45. Яких людей компанія зазвичай винагороджує?", type: "textarea" },
      { key: "probation_failures", label: "46. Через що люди найчастіше не проходять випробувальний термін?", type: "textarea" },
    ],
  },
  {
    sectionKey: "search_market",
    title: "11. Ринок пошуку",
    questions: [
      { key: "source_companies", label: "47. З яких компаній доцільно шукати кандидатів?", type: "textarea" },
      { key: "priority_industries", label: "48. Які індустрії є пріоритетними?", type: "textarea" },
      { key: "adjacent_industries", label: "49. Які індустрії можна розглядати як суміжні?", type: "textarea" },
      { key: "reference_companies", label: "50. Які компанії є прямими референсами?", type: "textarea" },
      { key: "stop_list", label: "51. Які компанії або організації входять до stop-list?", type: "textarea" },
      { key: "past_employer_limits", label: "52. Чи існують обмеження щодо колишніх роботодавців кандидатів?", type: "textarea" },
    ],
  },
  {
    sectionKey: "conditions",
    title: "12. Умови",
    questions: [
      { key: "work_location", label: "53. Локація роботи.", type: "textarea" },
      { key: "work_format", label: "54. Формат роботи", type: "radio", options: ["Офіс", "Гібрид", "Віддалено"] },
      { key: "business_trips", label: "55. Відрядження.", type: "radio", options: ["Так", "Ні"] },
      { key: "compensation_level", label: "56. Рівень компенсації.", type: "text", financial: true },
      { key: "bonus_scheme", label: "57. Бонусна схема.", type: "textarea", financial: true },
      { key: "benefits", label: "58. Додаткові бенефіти.", type: "textarea", financial: true },
      { key: "notice_wait", label: "59. Скільки компанія готова чекати кандидата з попереднього місця роботи?", type: "text" },
    ],
  },
  {
    sectionKey: "selection_process",
    title: "14. Процес відбору",
    questions: [
      { key: "interview_stages", label: "60. Які етапи інтерв'ю заплановані?", type: "textarea" },
      { key: "who_evaluates", label: "62. Хто бере участь в оцінці кандидатів?", type: "textarea" },
      { key: "final_decision_maker", label: "63. Хто ухвалює фінальне рішення?", type: "textarea" },
      { key: "tests_cases", label: "64. Чи передбачені тести, кейси або оцінювання?", type: "radio", options: ["Так", "Ні"] },
      { key: "decisive_criteria", label: "65. Які критерії є вирішальними при фінальному виборі?", type: "textarea" },
    ],
  },
  {
    sectionKey: "final_questions",
    title: "15. Завершальні питання",
    questions: [
      { key: "ideal_in_three_sentences", label: "66. Якщо б ви могли описати ідеального кандидата трьома реченнями, що б ви сказали?", type: "textarea" },
      { key: "market_benchmark", label: "67. Кого ви вважаєте еталоном для цієї ролі на ринку?", type: "textarea" },
      { key: "definitely_not", label: "68. Кого ви точно не хочете бачити на цій посаді?", type: "textarea" },
    ],
  },
];
