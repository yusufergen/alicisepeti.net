export interface CityLocationData {
  districts: Record<string, string[]>;
}

export const TURKEY_PROVINCES: string[] = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
  'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
  'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
  'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale',
  'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
  'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
  'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak',
  'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
];

export const TURKEY_LOCATION_TREE: Record<string, Record<string, string[]>> = {
  İstanbul: {
    Kadıköy: ['Suadiye', 'Caddebostan', 'Fenerbahçe', 'Göztepe', 'Bostancı', 'Moda', 'Kozyatağı', 'Erenköy', 'Acıbadem'],
    Beşiktaş: ['Etiler', 'Bebek', 'Levent', 'Ulus', 'Ortaköy', 'Akatlar', 'Nisbetiye', 'Dikilitaş'],
    Sarıyer: ['Zekeriyaköy', 'Tarabya', 'Yeniköy', 'İstinye', 'Emirgan', 'Maslak', 'Reşitpaşa'],
    Şişli: ['Nişantaşı', 'Teşvikiye', 'Bomonti', 'Fulya', 'Mecidiyeköy', 'Esentepe'],
    Üsküdar: ['Altunizade', 'Çengelköy', 'Kuzguncuk', 'Beylerbeyi', 'Acıbadem', 'Kandilli'],
    Bakırköy: ['Ataköy', 'Yeşilköy', 'Florya', 'Zuhuratbaba', 'Bahçelievler Sınırı'],
    Ataşehir: ['Batı Ataşehir', 'Barbaros', 'Atatürk', 'Küçükbakkalköy', 'İçerenköy'],
    Beykoz: ['Acarlar', 'Kavacık', 'Çubuklu', 'Riva', 'Kanlıca'],
    Maltepe: ['Küçükyalı', 'İdealtepe', 'Altayçeşme', 'Bağlarbaşı', 'Cevizli'],
    Kartal: ['Dragos', 'Orhantepe', 'Kordonboyu', 'Yakacık', 'Soğanlık'],
    Başakşehir: ['Bahçeşehir 1. Kısım', 'Bahçeşehir 2. Kısım', 'Kayabaşı', 'Başak'],
    Beylikdüzü: ['Adnan Kahveci', 'Barış', 'Büyükşehir', 'Yakuplu', 'Kavaklı'],
  },
  Ankara: {
    Çankaya: ['Çayyolu', 'Ümitköy', 'Yaşamkent', 'Oran', 'Gaziosmanpaşa', 'Bahçelievler', 'Ayrancı', 'Yıldız'],
    Gölbaşı: ['İncek', 'Kızılcaşar', 'Taşpınar', 'Karşıyaka'],
    Yenimahalle: ['Batıkent', 'Çakırlar', 'Demetevler', 'Alacaatlı', 'Macunköy'],
    Etimesgut: ['Eryaman', 'Bağlıca', 'Elvankent', 'Tunahan'],
    Keçiören: ['Etlik', 'Ovacık', 'Subayevleri', 'Ayvalı'],
  },
  İzmir: {
    Urla: ['İskele', 'Kalabak', 'Kekliktepe', 'Zeytinalanı', 'Güvendik', 'Kuşçular'],
    Karşıyaka: ['Bostanlı', 'Mavişehir', 'Atakent', 'Alaybey', 'Aksoy'],
    Bornova: ['Atatürk', 'Erzene', 'Kazımdirik', 'Evka 3', 'Özkanlar'],
    Çeşme: ['Alaçatı', 'Ilıca', 'Dalyan', 'Ovacık', 'Boyalık'],
    Konak: ['Alsancak', 'Göztepe', 'Güzelyalı', 'Hatay', 'Kültür'],
    Güzelbahçe: ['Kahramandere', 'Yalı', 'Maltepe', 'Siteler'],
  },
  Antalya: {
    Muratpaşa: ['Lara', 'Fener', 'Şirinyalı', 'Çağlayan', 'Güzeloba', 'Konyaaltı Sınırı'],
    Konyaaltı: ['Liman', 'Hurma', 'Gürsu', 'Uncalı', 'Sarısu', 'Altınkum'],
    Alanya: ['Oba', 'Mahmutlar', 'Kestel', 'Cikcilli', 'Avsallar'],
    Döşemealtı: ['Yeniköy', 'Yeşilbayır', 'Altınkale'],
  },
  Bursa: {
    Nilüfer: ['Bademli', 'Özlüce', 'Balat', 'Görükle', 'İhsaniye', 'Ertuğrul', 'Fethiye'],
    Osmangazi: ['Çekirge', 'Kükürtlü', 'Hüdavendigar', 'Doburca'],
    Mudanya: ['Güzelyalı', 'Bademli Sahil', 'Çağrışan'],
  },
  Muğla: {
    Bodrum: ['Yalıkavak', 'Türkbükü', 'Bitez', 'Ortakent', 'Turgutreis', 'Gümüşlük', 'Konacık'],
    Fethiye: ['Çalış', 'Göcek', 'Ölüdeniz', 'Hisarönü', 'Tuzla'],
    Marmaris: ['İçmeler', 'Armutalan', 'Söğüt', 'Siteler'],
    Datça: ['İskele', 'Mesudiye', 'Palamutbükü'],
  },
  Kocaeli: {
    İzmit: ['Yahya Kaptan', 'Alikahya', 'Yenişehir', 'Kabaoğlu'],
    Başiskele: ['Yuvacık', 'Sepetlipınar', 'Körfez'],
    Gebze: ['Osman Yılmaz', 'İstasyon', 'Yenikent'],
    Kartepe: ['Maşukiye', 'Ataevler', 'Fatih Sultan Mehmet'],
  },
  Adana: {
    Çukurova: ['Güzelyalı', 'Turgut Özal', 'Toros', 'Mahfesığmaz', 'Belediye Evleri'],
    Seyhan: ['Ziyapaşa', 'Reşatbey', 'Kurtuluş', 'Gazipaşa'],
  },
  Gaziantep: {
    Şehitkamil: ['İbrahimli', 'Batıkent', 'Güvenevler', 'Pancarlı', 'Sarıgüllük'],
    Şahinbey: ['Karataş', 'Akkent', 'Yeditepe'],
  },
  Mersin: {
    Yenişehir: ['Pozcu', 'Akkent', 'Çiftlikköy', 'Kuzeykent', 'Fuar'],
    Mezitli: ['Viranşehir', 'Tece', 'Soli', 'Davultepe'],
  },
  Eskişehir: {
    Tepebaşı: ['Batıkent', 'Sütlüce', 'Ertuğrulgazi', 'Çamlıca'],
    Odunpazarı: ['Vişnelik', 'Büyükdere', 'Sümer', 'Kırmızıtoprak'],
  },
  Konya: {
    Selçuklu: ['Yazır', 'Bosna Hersek', 'Sancak', 'Feritpaşa'],
    Meram: ['Aşkan', 'Konevi', 'Havzan', 'Lalebahçe'],
  },
  Trabzon: {
    Ortahisar: ['Boztepe', 'Beşirli', 'Kalkınma', 'Pelitli', 'Yalıncak'],
    Yomra: ['Kaşüstü', 'Sancak'],
  },
  Samsun: {
    Atakum: ['Atakent', 'Mimarsinan', 'Körfez', 'Yenimahalle', 'Cumhuriyet'],
    İlkadım: ['Çiftlik', 'Kale', 'Liman'],
  },
  Kayseri: {
    Melikgazi: ['Alpaslan', 'Köşk', 'Gültepe', 'Yıldırım Beyazıt'],
    Talas: ['Mevlana', 'Bahçelievler', 'Yenidoğan'],
  },
  Tekirdağ: {
    Süleymanpaşa: ['Hürriyet', '100. Yıl', 'Çınarlı', 'Değirmenaltı'],
    Çorlu: ['Esentepe', 'Kazımiye', 'Reşadiye'],
  },
  Aydın: {
    Kuşadası: ['Davutlar', 'Güzelçamlı', 'Kadınlar Denizi', 'Türkmen'],
    Didim: ['Altınkum', 'Efeler', 'Akbük'],
  },
  Balıkesir: {
    Edremit: ['Akçay', 'Güre', 'Altınoluk', 'Zeytinli'],
    Ayvalık: ['Cunda', 'Sarımsaklı', 'Küçükköy'],
  },
  Sakarya: {
    Serdivan: ['Arabacıalanı', 'Kemalpaşa', 'İstiklal', 'Yazlık'],
    Sapanca: ['Kırkpınar', 'Rüstempaşa', 'Yanık'],
  },
  Denizli: {
    Pamukkale: ['Bağbaşı', 'Kınıklı', 'Asmalıevler', 'İncilipınar'],
    Merkezefendi: ['Yenişehir', 'Servergazi', 'Adalet'],
  },
};

export function getDistrictsForCity(city: string): string[] {
  const cityData = TURKEY_LOCATION_TREE[city];
  if (cityData) {
    return Object.keys(cityData);
  }
  return ['Merkez'];
}

export function getNeighborhoodsForDistrict(city: string, district: string): string[] {
  const cityData = TURKEY_LOCATION_TREE[city];
  if (cityData && cityData[district]) {
    return cityData[district];
  }
  return [];
}
