# Каталог: раздел -> категории. (slug, ru, sr, plural_ru, plural_sr, synonyms, icon, unit, urgent)
SECTIONS = [
    ("remont", "Ремонт и отделка", "Renoviranje", "Мастера по ремонту", "Majstori za renoviranje", "ремонт квартиры renoviranje stana adaptacija", "hammer", [
        ("keramicar", "Плиточник", "Keramičar", "Плиточники", "Keramičari", "плитка кафель pločice keramika", "tile", "m2", False),
        ("moler", "Маляр", "Moler", "Маляры", "Moleri", "покраска стен малярные кречење krečenje farbanje", "roller", "m2", False),
        ("gipsar", "Гипсокартон", "Gipsar", "Мастера по гипсокартону", "Gipsari", "гипсокартон перегородки gips knauf", "wall", "m2", False),
        ("parketar", "Полы и паркет", "Parketar", "Паркетчики", "Parketari", "паркет ламинат пол parket laminat", "floor", "m2", False),
        ("stolar", "Двери и окна", "Stolar", "Столяры", "Stolari", "двери окна столяр vrata prozori pvc", "door", "visit", False),
    ]),
    ("vodoinstalacije", "Сантехника", "Vodoinstalacije", "Сантехники", "Vodoinstalateri", "сантехник водопроводчик vodoinstalater", "drop", [
        ("vodoinstalater", "Сантехник", "Vodoinstalater", "Сантехники", "Vodoinstalateri", "сантехник протечка течёт кран смеситель curi voda slavina odgušenje", "drop", "visit", True),
        ("bojler", "Бойлеры", "Bojleri", "Мастера по бойлерам", "Majstori za bojlere", "бойлер водонагреватель bojler čišćenje bojlera", "heater", "visit", False),
        ("odgusenje", "Засоры", "Odgušenje", "Мастера по засорам", "Majstori za odgušenje", "засор канализация odgušenje kanalizacija", "pipe", "visit", True),
    ]),
    ("elektrika", "Электрика", "Elektrika", "Электрики", "Električari", "электрик электрика električar struja", "bolt", [
        ("elektricar", "Электрик", "Električar", "Электрики", "Električari", "электрик розетка проводка свет električar utičnica instalacija", "bolt", "visit", True),
        ("rasveta", "Освещение", "Rasveta", "Мастера по освещению", "Majstori za rasvetu", "люстра светильник lusteri rasveta", "lamp", "visit", False),
    ]),
    ("klima-i-aparati", "Климат и техника", "Klima i aparati", "Мастера по технике", "Serviseri", "кондиционер техника klima aparati servis", "wind", [
        ("klima-servis", "Кондиционеры", "Klima uređaji", "Мастера по кондиционерам", "Klima serviseri", "кондиционер сплит заправка чистка klima servis montaža punjenje", "wind", "visit", False),
        ("ves-masina", "Стиральные машины", "Veš mašine", "Мастера по стиральным машинам", "Serviseri veš mašina", "стиральная машина veš mašina popravka", "washer", "visit", False),
        ("frizider", "Холодильники", "Frižideri", "Мастера по холодильникам", "Serviseri frižidera", "холодильник frižider zamrzivač", "fridge", "visit", False),
    ]),
    ("brave-i-sigurnost", "Замки и безопасность", "Brave i sigurnost", "Мастера по замкам", "Bravari", "замок вскрытие дверей бравар bravar brava", "key", [
        ("bravar", "Вскрытие и замена замков", "Bravar", "Слесари по замкам", "Bravari", "вскрыть дверь заклинило замок bravar otključavanje", "key", "visit", True),
        ("video-nadzor", "Видеонаблюдение", "Video nadzor", "Мастера по видеонаблюдению", "Majstori za video nadzor", "камеры видеонаблюдение домофон kamere interfon", "camera", "visit", False),
    ]),
    ("ciscenje", "Уборка", "Čišćenje", "Клинеры", "Čistačice", "уборка клининг čišćenje", "sparkle", [
        ("ciscenje-stana", "Уборка квартир", "Čišćenje stana", "Клинеры", "Čistačice", "уборка квартиры генеральная čišćenje stana generalno", "sparkle", "hour", False),
        ("pranje-prozora", "Мытьё окон", "Pranje prozora", "Мойщики окон", "Perači prozora", "мытьё окон pranje prozora", "window", "visit", False),
        ("dubinsko", "Химчистка мебели", "Dubinsko pranje", "Мастера химчистки", "Dubinsko pranje", "химчистка диван ковёр dubinsko pranje nameštaja tepiha", "sofa", "visit", False),
    ]),
    ("selidbe", "Переезды", "Selidbe", "Грузчики", "Selidbe", "переезд грузчики selidbe", "truck", [
        ("selidbe-kombi", "Перевозка и грузчики", "Selidbe i kombi", "Грузчики", "Selidbe", "переезд грузчики комби kombi prevoz selidba", "truck", "hour", False),
        ("montaza-namestaja", "Сборка мебели", "Montaža nameštaja", "Сборщики мебели", "Montažeri nameštaja", "сборка мебели икея montaža nameštaja ikea", "box", "visit", False),
        ("odvoz-smeca", "Вывоз мусора", "Odvoz šuta", "Вывоз мусора", "Odvoz šuta", "вывоз мусора строительный odvoz šuta", "trash", "visit", False),
    ]),
    ("auto", "Авто", "Auto", "Автомастера", "Auto majstori", "авто машина auto servis", "car", [
        ("auto-servis", "Автосервис", "Auto servis", "Автомеханики", "Automehaničari", "автосервис механик auto mehaničar", "car", "visit", False),
        ("vulkanizer", "Шиномонтаж", "Vulkanizer", "Шиномонтаж", "Vulkanizeri", "шины шиномонтаж gume vulkanizer", "tire", "visit", False),
        ("autoelektricar", "Автоэлектрик", "Autoelektričar", "Автоэлектрики", "Autoelektričari", "автоэлектрик akumulator", "battery", "visit", False),
        ("slep-sluzba", "Эвакуатор", "Šlep služba", "Эвакуаторы", "Šlep služba", "эвакуатор šlep", "tow", "visit", True),
    ]),
    ("lepota", "Красота", "Lepota", "Мастера красоты", "Majstori lepote", "красота beauty lepota", "scissors", [
        ("manikir", "Маникюр", "Manikir", "Мастера маникюра", "Manikirke", "маникюр ногти nokti manikir", "hand", "visit", False),
        ("frizer", "Парикмахер", "Frizer", "Парикмахеры", "Frizeri", "стрижка парикмахер frizer šišanje", "scissors", "visit", False),
        ("masaza", "Массаж", "Masaža", "Массажисты", "Maseri", "массаж masaža", "spa", "hour", False),
    ]),
    ("deca-i-nega", "Дети и уход", "Deca i nega", "Няни и сиделки", "Dadilje i negovateljice", "няня сиделка dadilja", "child", [
        ("dadilja", "Няни", "Dadilje", "Няни", "Dadilje", "няня бебиситтер dadilja bebisiterka", "child", "hour", False),
        ("negovateljica", "Сиделки", "Negovateljice", "Сиделки", "Negovateljice", "сиделка уход за пожилыми nega starijih", "heart", "hour", False),
    ]),
    ("casovi", "Обучение", "Časovi", "Репетиторы", "Profesori", "репетитор уроки časovi", "book", [
        ("casovi-matematike", "Математика", "Matematika", "Репетиторы по математике", "Profesori matematike", "математика репетитор matematika časovi", "book", "hour", False),
        ("srpski-jezik", "Сербский язык", "Srpski jezik", "Учителя сербского", "Profesori srpskog", "сербский язык для иностранцев srpski za strance", "chat", "hour", False),
        ("engleski", "Английский", "Engleski", "Учителя английского", "Profesori engleskog", "английский engleski", "chat", "hour", False),
        ("muzika", "Музыка", "Muzika", "Учителя музыки", "Profesori muzike", "гитара фортепиано gitara klavir", "music", "hour", False),
    ]),
    ("racunari", "Компьютеры и телефоны", "Računari i telefoni", "Компьютерные мастера", "Serviseri računara", "компьютер ноутбук телефон računar laptop", "laptop", [
        ("servis-racunara", "Ремонт компьютеров", "Servis računara", "Компьютерные мастера", "Serviseri računara", "ремонт ноутбука компьютера servis laptopa", "laptop", "visit", False),
        ("servis-telefona", "Ремонт телефонов", "Servis telefona", "Мастера по телефонам", "Serviseri telefona", "ремонт телефона экран servis telefona ekran", "phone", "visit", False),
        ("internet", "Интернет и сети", "Internet i mreže", "Мастера по сетям", "Mrežni tehničari", "роутер wifi интернет ruter wifi", "wifi", "visit", False),
    ]),
    ("ljubimci", "Животные", "Ljubimci", "Мастера для животных", "Usluge za ljubimce", "собака кошка pas mačka", "paw", [
        ("sisanje-pasa", "Груминг", "Šišanje pasa", "Грумеры", "Groomeri", "груминг стрижка собак šišanje pasa", "paw", "visit", False),
        ("setanje-pasa", "Выгул собак", "Šetanje pasa", "Выгульщики", "Šetači pasa", "выгул собак šetanje pasa", "paw", "hour", False),
    ]),
    ("basta", "Сад и двор", "Bašta i dvorište", "Садовники", "Baštovani", "сад двор bašta", "leaf", [
        ("bastovan", "Садовник", "Baštovan", "Садовники", "Baštovani", "садовник газон košenje trave orezivanje", "leaf", "hour", False),
    ]),
    ("dogadjaji", "Мероприятия", "Događaji", "Мастера для мероприятий", "Usluge za događaje", "праздник событие proslava", "camera", [
        ("fotograf", "Фотограф", "Fotograf", "Фотографы", "Fotografi", "фотограф фотосессия fotograf", "camera", "hour", False),
        ("ketering", "Кейтеринг", "Ketering", "Кейтеринг", "Ketering", "кейтеринг еда ketering", "dish", "visit", False),
    ]),
    ("dokumenti", "Документы и бизнес", "Dokumenti i biznis", "Специалисты", "Stručnjaci", "переводчик бухгалтер prevodilac knjigovođa", "doc", [
        ("sudski-tumac", "Судебный переводчик", "Sudski tumač", "Судебные переводчики", "Sudski tumači", "судебный переводчик апостиль sudski tumač prevod", "doc", "visit", False),
        ("knjigovodja", "Бухгалтер", "Knjigovođa", "Бухгалтеры", "Knjigovođe", "бухгалтер предузетник knjigovođa paušal", "doc", "visit", False),
    ]),
]

DISTRICTS = [
    ("vracar", "Врачар", "Vračar", "во Врачаре", "na Vračaru"),
    ("stari-grad", "Стари-Град", "Stari grad", "в Стари-Граде", "na Starom gradu"),
    ("savski-venac", "Савски-Венац", "Savski venac", "в Савском Венце", "na Savskom vencu"),
    ("novi-beograd", "Нови-Белград", "Novi Beograd", "в Нови-Белграде", "na Novom Beogradu"),
    ("zemun", "Земун", "Zemun", "в Земуне", "u Zemunu"),
    ("zvezdara", "Звездара", "Zvezdara", "на Звездаре", "na Zvezdari"),
    ("vozdovac", "Вождовац", "Voždovac", "на Вождоваце", "na Voždovcu"),
    ("palilula", "Палилула", "Palilula", "на Палилуле", "na Paliluli"),
    ("cukarica", "Чукарица", "Čukarica", "на Чукарице", "na Čukarici"),
    ("rakovica", "Раковица", "Rakovica", "в Раковице", "u Rakovici"),
    ("surcin", "Сурчин", "Surčin", "в Сурчине", "u Surčinu"),
    ("grocka", "Гроцка", "Grocka", "в Гроцке", "u Grockoj"),
]

# Демо-мастера (помечены demo=True, удаляются одной командой перед запуском)
MASTERS = [
    dict(slug="marko-petrovic", name="Marko Petrović", kind="entrepreneur", level=2, rating=4.9, reviews=213, orders=388, reply=10, langs="sr,ru", exp=14, warranty=12, online=True, urgent=True,
         about_ru="Сантехник с 14-летним опытом. Протечки, бойлеры, замена смесителей и сифонов. Приезжаю со своим инструментом и запчастями.",
         about_sr="Vodoinstalater sa 14 godina iskustva. Curenja, bojleri, zamena slavina i sifona. Dolazim sa svojim alatom i delovima.",
         services=[("vodoinstalater", 2500), ("bojler", 3000), ("odgusenje", 3500)], districts=["vracar", "zvezdara", "stari-grad"],
         photo="/demo/av-marko.jpg", cover="/demo/hero.jpg", works=["/demo/w-bath-moody.jpg", "/demo/w-bw1.jpg", "/demo/w-bath.jpg"]),
    dict(slug="aleksej-smirnov", name="Aleksej Smirnov", kind="private", level=1, rating=5.0, reviews=47, orders=61, reply=5, langs="ru,sr", exp=9, warranty=6, online=True, urgent=False,
         about_ru="Сантехника под ключ: трубы, тёплый пол, разводка в новостройках. Говорю по-русски и по-сербски.",
         about_sr="Vodoinstalacije po sistemu ključ u ruke: cevi, podno grejanje, razvod u novogradnji. Govorim ruski i srpski.",
         services=[("vodoinstalater", 2000)], districts=["vracar", "novi-beograd", "zemun"],
         photo="", cover="/demo/w-bw1.jpg", works=["/demo/w-bw1.jpg", "/demo/w-bw2.jpg"]),
    dict(slug="dragan-markovic", name="Dragan Marković", kind="company", level=2, rating=4.9, reviews=321, orders=702, reply=8, langs="sr,en", exp=20, warranty=12, online=False, urgent=True,
         about_ru="Аварийный выезд 24/7 по всему Белграду: протечки, засоры, срочный ремонт.",
         about_sr="Hitne intervencije 24/7 na teritoriji celog Beograda: curenja, odgušenja, hitne popravke.",
         services=[("vodoinstalater", 4000), ("odgusenje", 4000)], districts=["vracar", "stari-grad", "savski-venac", "novi-beograd", "zemun", "zvezdara", "vozdovac", "palilula"],
         photo="", cover="/demo/w-kitchen.jpg", works=["/demo/w-kitchen.jpg"]),
    dict(slug="nikola-jovanovic", name="Nikola Jovanović", kind="entrepreneur", level=1, rating=4.8, reviews=164, orders=240, reply=15, langs="sr,ru", exp=11, warranty=12, online=True, urgent=True,
         about_ru="Электрик: проводка, щитки, розетки и свет. Работаю аккуратно, убираю за собой.",
         about_sr="Električar: instalacije, razvodne table, utičnice i rasveta. Radim uredno i čistim za sobom.",
         services=[("elektricar", 2500), ("rasveta", 2000)], districts=["vracar", "palilula", "zvezdara"],
         photo="", cover="/demo/w-elec.jpg", works=["/demo/w-elec.jpg"]),
    dict(slug="stefan-ilic", name="Stefan Ilić", kind="private", level=1, rating=4.7, reviews=98, orders=130, reply=25, langs="sr,ru", exp=7, warranty=6, online=False, urgent=False,
         about_ru="Бойлеры и водонагреватели: установка, чистка от накипи, ремонт.",
         about_sr="Bojleri: montaža, čišćenje kamenca, popravka.",
         services=[("bojler", 2200), ("vodoinstalater", 2200)], districts=["savski-venac", "vracar"],
         photo="", cover="/demo/w-bw3.jpg", works=["/demo/w-bw3.jpg"]),
    dict(slug="milan-djordjevic", name="Milan Đorđević", kind="entrepreneur", level=2, rating=4.8, reviews=76, orders=95, reply=30, langs="sr,ru", exp=16, warranty=24, online=True, urgent=False,
         about_ru="Ванные под ключ: демонтаж, плитка, сантехника. Гарантия 2 года.",
         about_sr="Kupatila po sistemu ključ u ruke: demontaža, pločice, sanitarije. Garancija 2 godine.",
         services=[("keramicar", 1800), ("vodoinstalater", 5000)], districts=["vracar", "vozdovac", "cukarica"],
         photo="", cover="/demo/w-bath-moody.jpg", works=["/demo/w-bath-moody.jpg", "/demo/w-bath.jpg", "/demo/w-bath-dark.jpg"]),
    dict(slug="jelena-kovacevic", name="Jelena Kovačević", kind="private", level=1, rating=4.9, reviews=58, orders=120, reply=20, langs="sr,en", exp=6, warranty=0, online=False, urgent=False,
         about_ru="Генеральная уборка и уборка после ремонта. Свои средства и техника.",
         about_sr="Generalno čišćenje i čišćenje posle renoviranja. Sopstvena sredstva i oprema.",
         services=[("ciscenje-stana", 1200), ("pranje-prozora", 2500)], districts=["vracar", "novi-beograd", "zemun", "stari-grad"],
         photo="", cover="/demo/w-bath.jpg", works=[]),
    dict(slug="ivan-popov", name="Ivan Popov", kind="private", level=1, rating=4.9, reviews=39, orders=52, reply=12, langs="ru,sr", exp=8, warranty=6, online=True, urgent=False,
         about_ru="Кондиционеры: монтаж, чистка, заправка фреоном. Выезд в день обращения.",
         about_sr="Klima uređaji: montaža, čišćenje, punjenje freonom. Izlazak istog dana.",
         services=[("klima-servis", 3500)], districts=["novi-beograd", "zemun", "surcin", "vracar"],
         photo="", cover="/demo/w-drill.jpg", works=["/demo/w-drill.jpg"]),
]

REVIEWS = [
    ("marko-petrovic", "Ana", 5, "ru", "Замена смесителя", "Приехал вовремя, всё сделал за час и убрал за собой. Цена как договорились.", "Пришёл вовремя,Убрал за собой"),
    ("marko-petrovic", "Milica", 5, "sr", "Čišćenje bojlera", "Odličan majstor, objasnio sve šta radi. Preporučujem.", "Objasnio šta radi"),
    ("marko-petrovic", "Дмитрий", 4, "ru", "Протечка", "Нашёл протечку за 10 минут. Пришлось ждать запчасть до следующего дня.", "Пришёл вовремя"),
    ("aleksej-smirnov", "Ольга", 5, "ru", "Тёплый пол", "Сделал тёплый пол в ванной, объяснил всё по-русски. Очень довольны.", "Объяснил, что делает"),
    ("nikola-jovanovic", "Petar", 5, "sr", "Nove utičnice", "Brzo i čisto, cena korektna.", "Brzo,Čisto"),
    ("milan-djordjevic", "Сергей", 5, "ru", "Ванная под ключ", "Сделали ванную за 9 дней, как и обещали.", "В срок"),
]
