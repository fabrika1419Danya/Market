import {
  db,
  users,
  games,
  lots,
  orders,
  messages,
  reviews,
  walletTransactions,
  type GameCategory,
} from "@/db";
import { count, eq } from "drizzle-orm";
import { hashPassword } from "./auth";

let seedPromise: Promise<void> | null = null;

const ALL_CATEGORIES: GameCategory[] = [
  "Аккаунты",
  "Валюта",
  "Услуги",
  "Предметы",
];

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }
  seedPromise = runSeed().catch((err) => {
    seedPromise = null;
    console.error("Database seed error:", err);
  });
  return seedPromise;
}

async function runSeed(): Promise<void> {
  const [{ totalGames }] = await db
    .select({ totalGames: count() })
    .from(games);

  if (totalGames > 0) {
    return;
  }

  const demoPasswordHash = await hashPassword("demo12345");

  const insertedUsers = await db
    .insert(users)
    .values([
      {
        username: "alex_trader",
        email: "alex@payloot.ru",
        passwordHash: demoPasswordHash,
        balance: "15400.00",
        avatar: "AT",
        bio: "Покупаю и продаю игровые скины, валюту и подписки с 2023 года. Быстрые сделки через гаранта.",
        rating: "4.95",
        reviewsCount: 3,
        isOnline: true,
        createdAt: new Date("2023-05-14T10:20:00Z"),
      },
      {
        username: "vortex_boost",
        email: "vortex@payloot.ru",
        passwordHash: demoPasswordHash,
        balance: "48900.00",
        avatar: "VB",
        bio: "Профессиональная студия калибровки, буста MMR и продажи чистых аккаунтов с родной почтой. Работаем 24/7.",
        rating: "5.00",
        reviewsCount: 4,
        isOnline: true,
        createdAt: new Date("2022-11-03T08:15:00Z"),
      },
      {
        username: "nord_vault",
        email: "nord@payloot.ru",
        passwordHash: demoPasswordHash,
        balance: "92300.00",
        avatar: "NV",
        bio: "Оптовый поставщик золота WoW, сфер PoE 2 и ключей пополнения Steam. Мгновенная автовыдача.",
        rating: "4.90",
        reviewsCount: 2,
        isOnline: true,
        createdAt: new Date("2023-01-22T14:00:00Z"),
      },
      {
        username: "sakura_genshin",
        email: "sakura@payloot.ru",
        passwordHash: demoPasswordHash,
        balance: "31750.00",
        avatar: "SG",
        bio: "Стартовые и хай-ранг аккаунты Genshin Impact / Honkai, Луна через официальный UID без входа на аккаунт.",
        rating: "5.00",
        reviewsCount: 2,
        isOnline: false,
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 42),
        createdAt: new Date("2024-02-10T11:45:00Z"),
      },
      {
        username: "kiber_lavka",
        email: "kiber@payloot.ru",
        passwordHash: demoPasswordHash,
        balance: "24100.00",
        avatar: "KL",
        bio: "Редкие скины CS2, ножи без трейд-бана, арканы Dota 2 и предметы коллекционных серий.",
        rating: "4.80",
        reviewsCount: 2,
        isOnline: true,
        createdAt: new Date("2023-08-19T17:30:00Z"),
      },
      {
        username: "dmitry_play",
        email: "dmitry@payloot.ru",
        passwordHash: demoPasswordHash,
        balance: "6850.00",
        avatar: "DP",
        bio: "Обычный игрок, покупаю золото для рейдов и продаю излишки фарма в Tarkov и PoE 2.",
        rating: "5.00",
        reviewsCount: 1,
        isOnline: false,
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 125),
        createdAt: new Date("2024-09-05T19:10:00Z"),
      },
    ])
    .returning();

  const uMap = Object.fromEntries(insertedUsers.map((u) => [u.username, u]));

  const insertedGames = await db
    .insert(games)
    .values([
      {
        name: "Counter-Strike 2",
        slug: "counter-strike-2",
        icon: "CS2",
        categories: ALL_CATEGORIES,
      },
      {
        name: "Dota 2",
        slug: "dota-2",
        icon: "D2",
        categories: ALL_CATEGORIES,
      },
      {
        name: "World of Warcraft",
        slug: "world-of-warcraft",
        icon: "WoW",
        categories: ALL_CATEGORIES,
      },
      {
        name: "Genshin Impact",
        slug: "genshin-impact",
        icon: "GI",
        categories: ALL_CATEGORIES,
      },
      {
        name: "Path of Exile 2",
        slug: "path-of-exile-2",
        icon: "PoE2",
        categories: ALL_CATEGORIES,
      },
      {
        name: "Valorant",
        slug: "valorant",
        icon: "VAL",
        categories: ALL_CATEGORIES,
      },
      {
        name: "Escape from Tarkov",
        slug: "escape-from-tarkov",
        icon: "EFT",
        categories: ALL_CATEGORIES,
      },
      {
        name: "Steam Баланс и Ключи",
        slug: "steam-wallet",
        icon: "STM",
        categories: ["Валюта", "Аккаунты", "Услуги", "Предметы"],
      },
    ])
    .returning();

  const gMap = Object.fromEntries(insertedGames.map((g) => [g.slug, g]));

  const insertedLots = await db
    .insert(lots)
    .values([
      // CS2
      {
        sellerId: uMap.vortex_boost.id,
        gameId: gMap["counter-strike-2"].id,
        category: "Аккаунты",
        serverName: "Prime / EU",
        title: "CS2 Prime Status • 18 500 Premier Elo • Родная почта + Первое письмо • Без банов",
        description:
          "Личный чистый аккаунт с Prime-статусом, открытым рейтингом Premier 18 500 очков, 650 часов в игре, зелёный фактор доверия. В комплекте первая родная почта (Firstmail) без привязок телефона. Мгновенная автовыдача сразу после оплаты!",
        price: "2490.00",
        stockCount: 4,
        isActive: true,
        autoDeliveryText:
          "STEAM LOGIN: cs2_prime_vault94 | PASS: K9#mP2vL8xQ | FIRSTMAIL: cs2_prime_vault94@firstmail.ltd | MAIL PASS: M8!zR4tW9p (Смените пароль и привяжите Steam Guard после проверки)",
      },
      {
        sellerId: uMap.kiber_lavka.id,
        gameId: gMap["counter-strike-2"].id,
        category: "Предметы",
        serverName: "Steam Trade",
        title: "AK-47 | Азимов (После полевых испытаний, Float 0.21) + 4 голографических стикера",
        description:
          "Чистый скин без трейд-холда, отправка обменом в течение 3 минут после оплаты. Проверьте открытый инвентарь и актуальную трейд-ссылку перед заказом.",
        price: "3650.00",
        stockCount: 2,
        isActive: true,
        autoDeliveryText: null,
      },
      {
        sellerId: uMap.vortex_boost.id,
        gameId: gMap["counter-strike-2"].id,
        category: "Услуги",
        serverName: "FACEIT / Premier",
        title: "Повышение рейтинга FACEIT (+100 ELO в пати без передачи аккаунта)",
        description:
          "Играем в лобби с двумя игроками 3200+ ELO. Без софта и передачи данных от вашего Steam. Средний винрейт 84%, старт в течение 15 минут.",
        price: "890.00",
        stockCount: 15,
        isActive: true,
        autoDeliveryText: null,
      },
      {
        sellerId: uMap.nord_vault.id,
        gameId: gMap["counter-strike-2"].id,
        category: "Валюта",
        serverName: "Все регионы",
        title: "Ключ пропуска Armory Pass (5 звёзд / пополнение на пропуск CS2)",
        description:
          "Код моментального пополнения кошелька для активации Armory Pass в CS2. Инструкция и код выдаются автоматически.",
        price: "1490.00",
        stockCount: 18,
        isActive: true,
        autoDeliveryText:
          "КОД АКТИВАЦИИ STEAM WALLET ($16): STMW-89KQ-44PL-92ZX — Активируйте в разделе Игры -> Активировать код кошелька Steam.",
      },

      // Dota 2
      {
        sellerId: uMap.vortex_boost.id,
        gameId: gMap["dota-2"].id,
        category: "Аккаунты",
        serverName: "EU West / RU",
        title: "Dota 2 • 5 650 MMR (Divine V) • Порядочность 11 800 • Родная почта",
        description:
          "Аккаунт откалиброван вручную без ботов и песочницы. Порядочность и вежливость 11 800+, открыт рейтинговый поиск, привязка виртуального номера готова к смене.",
        price: "3190.00",
        stockCount: 3,
        isActive: true,
        autoDeliveryText:
          "LOGIN: dota_divine_5650 | PASS: Dv5#Qp91Lm2 | EMAIL: dota_divine_5650@rambler.ru | EMAIL PASS: Rm9#Lp22Xz",
      },
      {
        sellerId: uMap.kiber_lavka.id,
        gameId: gMap["dota-2"].id,
        category: "Предметы",
        serverName: "Steam Trade",
        title: "Bladeform Legacy — Аркана на Juggernaut (Полный разблокированный стиль)",
        description:
          "Открыты оба стиля (Origins + Legacy), чистый предмет без удержаний обмена. Передача моментальным трейдом в Steam.",
        price: "2750.00",
        stockCount: 3,
        isActive: true,
        autoDeliveryText: null,
      },
      {
        sellerId: uMap.alex_trader.id,
        gameId: gMap["dota-2"].id,
        category: "Услуги",
        serverName: "Любой сервер",
        title: "Отыгрыш 3 игр Low Priority (Single Draft) быстро и вручную",
        description:
          "Сниму лоу-приорити за 2–3 часа. Играю строго через семейный доступ Steam без доступа к инвентарю и настройкам безопасности.",
        price: "450.00",
        stockCount: 10,
        isActive: true,
        autoDeliveryText: null,
      },

      // World of Warcraft
      {
        sellerId: uMap.nord_vault.id,
        gameId: gMap["world-of-warcraft"].id,
        category: "Валюта",
        serverName: "EU Гордунни / Ревущий фьорд",
        title: "500 000 Золота WoW: The War Within (Безопасная передача через гильдбанк / рейд)",
        description:
          "Чистое ручное золото от гильдии без ботов. Передаём через обмен с эпическим предметом или гильдейский банк за 5 минут. Онлайн весь день.",
        price: "1850.00",
        stockCount: 25,
        isActive: true,
        autoDeliveryText: null,
      },
      {
        sellerId: uMap.nord_vault.id,
        gameId: gMap["world-of-warcraft"].id,
        category: "Аккаунты",
        serverName: "EU / Казахстан",
        title: "Тайм-карта World of Warcraft 60 дней (EU / RU учётные записи) — Автовыдача",
        description:
          "Официальный цифровой ключ 60 дней игрового времени для европейских и СНГ аккаунтов Battle.net. Работает без смены региона!",
        price: "2690.00",
        stockCount: 14,
        isActive: true,
        autoDeliveryText:
          "КЛЮЧ BATTLE.NET 60 ДНЕЙ (EU): EU60-9842-7710-5539-4108 — Введите на странице account.battle.net/overview в поле «Использовать код».",
      },
      {
        sellerId: uMap.vortex_boost.id,
        gameId: gMap["world-of-warcraft"].id,
        category: "Услуги",
        serverName: "EU Все миры",
        title: "Мифик+ 10 ключ в таймер + Торговцы бронёй по типу вашего класса",
        description:
          "Прохождение подземелья 10 уровня в тайм для Великого Хранилища (максимальная награда недели). Вы можете стоять у входа или идти с группой.",
        price: "790.00",
        stockCount: 12,
        isActive: true,
        autoDeliveryText: null,
      },

      // Genshin Impact
      {
        sellerId: uMap.sakura_genshin.id,
        gameId: gMap["genshin-impact"].id,
        category: "Валюта",
        serverName: "Европа / Азия / Америка",
        title: "Благословение Полой Луны (30 дней + 300 кристаллов) по UID за 2 минуты",
        description:
          "Официальное пополнение через партнёрский шлюз строго по вашему UID и серверу. Пароль от аккаунта НЕ требуется, чек покупки сохраняется.",
        price: "420.00",
        stockCount: 40,
        isActive: true,
        autoDeliveryText: null,
      },
      {
        sellerId: uMap.sakura_genshin.id,
        gameId: gMap["genshin-impact"].id,
        category: "Аккаунты",
        serverName: "Европа (EU)",
        title: "AR 50 Европа • Фурина + Нёвиллет + Сигнатурный катализатор + 14 200 Примогемов",
        description:
          "Без привязки почты и телефона, день рождения не установлен. Идеальный аккаунт для закрытия Бездны с первого дня. Выдача моментальная!",
        price: "1990.00",
        stockCount: 3,
        isActive: true,
        autoDeliveryText:
          "HOYOVERSE LOGIN: genshin_eu_furina88 | PASS: Fr9!Nv42Lp8 | Привязок нет — сразу укажите свою почту в личном кабинете HoYoverse.",
      },

      // Path of Exile 2
      {
        sellerId: uMap.nord_vault.id,
        gameId: gMap["path-of-exile-2"].id,
        category: "Валюта",
        serverName: "Standard / Dawn of the Hunt",
        title: "50x Божественная сфера (Divine Orb) — Ручной фарм, быстрая встреча в убежище",
        description:
          "Безопасная сделка: положите любой редкий (жёлтый) предмет в окно обмена. Доставка за 2–4 минуты в вашем убежище.",
        price: "1150.00",
        stockCount: 30,
        isActive: true,
        autoDeliveryText: null,
      },
      {
        sellerId: uMap.dmitry_play.id,
        gameId: gMap["path-of-exile-2"].id,
        category: "Предметы",
        serverName: "Dawn of the Hunt",
        title: "Ingenuity Utility Belt (+78% усиление колец, топовый ролл без осквернения)",
        description:
          "Личный дроп с босса, чистый пояс без осквернения. Скриншот статов могу скинуть в чат перед покупкой.",
        price: "1650.00",
        stockCount: 1,
        isActive: true,
        autoDeliveryText: null,
      },

      // Valorant
      {
        sellerId: uMap.vortex_boost.id,
        gameId: gMap["valorant"].id,
        category: "Аккаунты",
        serverName: "EU (Стокгольм / Франкфурт)",
        title: "Valorant EU • Нож Керамбит «Жнец» + Вандал «Прайм» • Ранг Расцвет 1 • Смена почты",
        description:
          "Полная перепривязка на вашу электронную почту при покупке. Голосовой чат работает, блокировок нет.",
        price: "3400.00",
        stockCount: 2,
        isActive: true,
        autoDeliveryText:
          "RIOT ID: val_reaver_eu19 | PASS: Vl7#Rv90Kp3 | ПОЧТА: val_reaver_eu19@firstmail.ltd | ПАРОЛЬ ПОЧТЫ: Fm3#Kp88Qz",
      },
      {
        sellerId: uMap.nord_vault.id,
        gameId: gMap["valorant"].id,
        category: "Валюта",
        serverName: "EU / RU",
        title: "2 050 Valorant Points (Код пополнения EU региона) — Мгновенная автовыдача",
        description:
          "Активируется прямо в клиенте Valorant (значок VP в правом верхнем углу -> Коды предоплаты). Моментальная выдача после оплаты.",
        price: "1790.00",
        stockCount: 9,
        isActive: true,
        autoDeliveryText:
          "КОД VALORANT POINTS (2050 VP EU): RA-EU2050-7741-9920-3814",
      },

      // Escape from Tarkov
      {
        sellerId: uMap.dmitry_play.id,
        gameId: gMap["escape-from-tarkov"].id,
        category: "Услуги",
        serverName: "RU / EU PvP",
        title: "Сопровождение в рейде на Лабораторию (2 полных выноса топ-лута + ключ-карта)",
        description:
          "Идём вдвоём, открываю все комнаты, весь найденный ценный лут и снаряжение рейдеров забираете вы. Гарантия выживания в 2 рейдах.",
        price: "950.00",
        stockCount: 6,
        isActive: true,
        autoDeliveryText: null,
      },
      {
        sellerId: uMap.alex_trader.id,
        gameId: gMap["escape-from-tarkov"].id,
        category: "Аккаунты",
        serverName: "СНГ / РФ",
        title: "Escape from Tarkov: Prepare for Escape Edition (СНГ регион, чистый профиль)",
        description:
          "Улучшенное издание с увеличенным схроном и защищённым контейнером Бета. Перепривязка почты включена.",
        price: "4200.00",
        stockCount: 1,
        isActive: true,
        autoDeliveryText: null,
      },

      // Steam Wallet
      {
        sellerId: uMap.nord_vault.id,
        gameId: gMap["steam-wallet"].id,
        category: "Валюта",
        serverName: "РФ / КЗ / СНГ",
        title: "Пополнение баланса Steam на 1 000 ₽ по логину (Комиссия минимальная)",
        description:
          "Пополняем российские, казахстанские и СНГ аккаунты по логину Steam (не никнейму!). Зачисление за 1–2 минуты.",
        price: "1065.00",
        stockCount: 100,
        isActive: true,
        autoDeliveryText: null,
      },
      {
        sellerId: uMap.alex_trader.id,
        gameId: gMap["steam-wallet"].id,
        category: "Предметы",
        serverName: "Steam Gift",
        title: "Ключ активации Cyberpunk 2077: Ultimate Edition (GOG / Global, Автовыдача)",
        description:
          "Полное издание с дополнением Phantom Liberty и русской озвучкой. Активируется без VPN в любом регионе.",
        price: "2290.00",
        stockCount: 5,
        isActive: true,
        autoDeliveryText:
          "GOG GLOBAL KEY: CP77-ULTM-9043-8821-7745 — Активируйте на сайте gog.com/redeem или в приложении GOG Galaxy.",
      },
    ])
    .returning();

  // Create sample completed orders & reviews so seller ratings and public review feeds are authentic
  const historicalOrders = await db
    .insert(orders)
    .values([
      {
        buyerId: uMap.alex_trader.id,
        sellerId: uMap.vortex_boost.id,
        lotId: insertedLots[0].id,
        amount: "2490.00",
        status: "completed",
        deliveredData:
          "STEAM LOGIN: cs2_prime_vault11 | PASS: X7#mP2vL8xQ | FIRSTMAIL: cs2_prime_vault11@firstmail.ltd",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 71),
      },
      {
        buyerId: uMap.dmitry_play.id,
        sellerId: uMap.vortex_boost.id,
        lotId: insertedLots[2].id,
        amount: "890.00",
        status: "completed",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 45),
      },
      {
        buyerId: uMap.alex_trader.id,
        sellerId: uMap.nord_vault.id,
        lotId: insertedLots[7].id,
        amount: "1850.00",
        status: "completed",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 29),
      },
      {
        buyerId: uMap.dmitry_play.id,
        sellerId: uMap.sakura_genshin.id,
        lotId: insertedLots[10].id,
        amount: "420.00",
        status: "completed",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 19),
      },
      {
        buyerId: uMap.vortex_boost.id,
        sellerId: uMap.alex_trader.id,
        lotId: insertedLots[19].id,
        amount: "2290.00",
        status: "completed",
        deliveredData: "GOG GLOBAL KEY: CP77-ULTM-1120-4410-9921",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 13),
      },
      {
        buyerId: uMap.alex_trader.id,
        sellerId: uMap.kiber_lavka.id,
        lotId: insertedLots[1].id,
        amount: "3650.00",
        status: "paid",
        createdAt: new Date(Date.now() - 1000 * 60 * 25),
      },
    ])
    .returning();

  await db.insert(reviews).values([
    {
      orderId: historicalOrders[0].id,
      authorId: uMap.alex_trader.id,
      targetUserId: uMap.vortex_boost.id,
      rating: 5,
      text: "Автовыдача сработала за секунду! Почта действительно первая родная, прайм и рейтинг соответствуют описанию. Рекомендую продавца.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 70),
    },
    {
      orderId: historicalOrders[1].id,
      authorId: uMap.dmitry_play.id,
      targetUserId: uMap.vortex_boost.id,
      rating: 5,
      text: "Апнули +105 ELO за 4 карты подряд, парни отлично колят раунды. Буду брать ещё!",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 44),
    },
    {
      orderId: historicalOrders[2].id,
      authorId: uMap.alex_trader.id,
      targetUserId: uMap.nord_vault.id,
      rating: 5,
      text: "Золото на Гордунни передали за 3 минуты через гильдбанк, приятный курс и вежливый продавец.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28),
    },
    {
      orderId: historicalOrders[3].id,
      authorId: uMap.dmitry_play.id,
      targetUserId: uMap.sakura_genshin.id,
      rating: 5,
      text: "Луна пришла на аккаунт буквально через минуту после отправки UID в чат!",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
    },
    {
      orderId: historicalOrders[4].id,
      authorId: uMap.vortex_boost.id,
      targetUserId: uMap.alex_trader.id,
      rating: 5,
      text: "Ключ активировался моментально, издание полное с дополнением. Отличный продавец!",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
  ]);

  // Recalculate exact ratings & review counts for seeded sellers based on actual reviews table
  for (const u of insertedUsers) {
    const userReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.targetUserId, u.id));
    if (userReviews.length > 0) {
      const avg =
        userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length;
      await db
        .update(users)
        .set({
          rating: avg.toFixed(2),
          reviewsCount: userReviews.length,
        })
        .where(eq(users.id, u.id));
    } else {
      await db
        .update(users)
        .set({ rating: "5.00", reviewsCount: 0 })
        .where(eq(users.id, u.id));
    }
  }

  // Seed initial chat messages for the active escrow order #6 (alex_trader <-> kiber_lavka)
  const activeOrder = historicalOrders[5];
  await db.insert(messages).values([
    {
      senderId: uMap.alex_trader.id,
      receiverId: uMap.kiber_lavka.id,
      orderId: activeOrder.id,
      isSystem: true,
      text: `Покупатель alex_trader оплатил заказ #${activeOrder.id} на сумму 3 650 ₽. Средства зарезервированы системой безопасной сделки.`,
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
    },
    {
      senderId: uMap.alex_trader.id,
      receiverId: uMap.kiber_lavka.id,
      orderId: activeOrder.id,
      isSystem: false,
      text: "Привет! Оплатил AK-47 Азимов, моя трейд-ссылка готова в профиле. Жду обмен :)",
      timestamp: new Date(Date.now() - 1000 * 60 * 24),
    },
    {
      senderId: uMap.kiber_lavka.id,
      receiverId: uMap.alex_trader.id,
      orderId: activeOrder.id,
      isSystem: false,
      text: "Приветствую! Обмен отправил в Steam, проверь наклейки и флоат. Как примешь — подтверди выполнение заказа.",
      timestamp: new Date(Date.now() - 1000 * 60 * 21),
    },
  ]);

  await db.insert(walletTransactions).values([
    {
      userId: uMap.alex_trader.id,
      type: "topup",
      amount: "20000.00",
      description: "Пополнение баланса через СБП",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
    },
    {
      userId: uMap.alex_trader.id,
      type: "sale_release",
      amount: "2290.00",
      description: `Зачисление средств по завершённому заказу #${historicalOrders[4].id}`,
      orderId: historicalOrders[4].id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 13),
    },
    {
      userId: uMap.alex_trader.id,
      type: "escrow_hold",
      amount: "-3650.00",
      description: `Оплата и заморозка средств по заказу #${activeOrder.id}`,
      orderId: activeOrder.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 25),
    },
  ]);
}
