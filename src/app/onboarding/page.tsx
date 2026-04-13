export default function OnboardingPage() {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">
              Onboarding MotoTwin
            </h1>
            <p className="mt-4 text-base leading-7 text-gray-600">
              Здесь будет первый пользовательский сценарий: выбор бренда, модели,
              модификации, ввод пробега, VIN и профиля эксплуатации.
            </p>
            <p className="mt-4 text-base leading-7 text-gray-600">
              На следующем шаге мы подключим эту страницу к live-данным BMW и KTM
              через уже готовые API.
            </p>
          </div>
        </div>
      </main>
    );
  }