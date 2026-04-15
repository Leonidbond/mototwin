import Link from "next/link";

const features = [
  {
    title: "Профиль мотоцикла",
    description:
      "Храните марку, модель, модификацию, VIN, пробег и профиль эксплуатации в одной структурированной системе.",
  },
  {
    title: "История обслуживания",
    description:
      "Фиксируйте все сервисные события в одном месте: что сделано, когда, на каком пробеге и за какую стоимость.",
  },
  {
    title: "Напоминания по ТО",
    description:
      "Сразу видно, что в порядке, что скоро потребует внимания и что уже просрочено по ключевым узлам.",
  },
  {
    title: "Совместимые детали",
    description:
      "Подбирайте совместимые детали по узлу на основе структурированной fitment-логики, а не догадок.",
  },
  {
    title: "Расходы на владение",
    description:
      "Учитывайте стоимость деталей, работ, расходников и ремонтов, чтобы видеть реальную стоимость владения.",
  },
  {
    title: "Логика для реального владельца",
    description:
      "Продукт построен вокруг реального сценария владения мотоциклом: обслуживание, детали, состояние и расходы.",
  },
];

const benefits = [
  "Меньше ошибок при подборе деталей",
  "Понятная история обслуживания в одной системе",
  "Лучший контроль состояния мотоцикла",
  "Прозрачные расходы на владение",
  "Один интерфейс вместо заметок, чатов и чеков",
];

const audience = [
  "Для владельцев, которые обслуживают мотоцикл сами",
  "Для тех, кто внимательно относится к сервисной истории",
  "Для тех, кто хочет точный подбор деталей без ошибки",
  "Для владельцев, которым нужен контроль над обслуживанием и расходами",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-950">
      <section className="border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600">
              MotoTwin | Цифровой гараж для владельца мотоцикла
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
              MotoTwin | цифровой гараж для вашего мотоцикла
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
              Узлы, история обслуживания, напоминания, совместимые детали и
              расходы в одном интерфейсе.
            </p>

            <p className="mt-6 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
              MotoTwin это не просто каталог деталей. Это система сопровождения
              владения мотоциклом: от профиля техники до сервиса, расходов и
              подбора совместимых компонентов.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Начать
              </Link>
              <Link
                href="/garage"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Перейти в гараж
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Посмотреть сценарий
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
            Что делает сервис
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
            MotoTwin объединяет ключевой сценарий владения мотоциклом:
            профиль, обслуживание, напоминания, fitment и расходы.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-950">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
              Как это работает
            </h2>
            <div className="mt-8 space-y-6">
              {[
                "Добавьте свой мотоцикл",
                "Ведите обслуживание и пробег",
                "Получайте статусы, напоминания и совместимые детали",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="pt-1 text-base font-medium text-gray-900">
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-950">
                Почему это полезно
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
                {benefits.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-950">
                Для кого MotoTwin
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
                {audience.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="rounded-3xl bg-gray-950 px-8 py-10 text-white">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Стартуем с управляемого MVP
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-300 sm:text-base">
              MotoTwin MVP стартует с BMW и KTM и фокусируется на реальном
              сервисном сценарии: профиль техники, ключевые узлы, журнал
              обслуживания, напоминания, fitment и расходы на владение.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-medium text-gray-950 transition hover:bg-gray-100"
              >
                Перейти к onboarding
              </Link>
              <Link
                href="/api/brands"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Проверить live data
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}