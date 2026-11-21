# Duble-S Motion: Dizi Stüdyosu

## Amaç

Kullanıcının dizi, karakterler ve bölüm senaryoları oluşturabildiği; sahne ve çekimleri, seslendirmeyi, dudak senkronizasyonunu ve kurguyu tek bir çalışma alanında yönettiği bir üretim akışı. İlk pilot: **Cizre'nin Delikanlıları**, 1. bölüm, 1. sahne.

## Mevcut durum

- Video ve görsel üretimi, dosya yükleme ve üretim geçmişi mevcut.
- Metinden ses üretimi mevcut, fakat iki sabit avatar sesine odaklanıyor; dizi karakterleri için ses seçimi ve kayıtlı ses profili henüz doğrulanmış değil.
- Konuşan avatar akışı belirli avatar görselleri kullanıyor. Herhangi bir çizgi film karakterinde, mevcut sahne videosuyla güvenilir dudak eşleştirmesi yaptığı varsayılmamalı.
- Kurgu ekranında görsel ve ses klipleri için zaman çizelgesi mevcut. Bir bölümün otomatik, güvenilir şekilde dışa aktarılması ayrıca doğrulanmalı.
- `generateStoryboard` süreye göre genel sahne istemleri oluşturuyor; senaryodaki sahneleri, konuşmacıları ve replikleri ayrıştıran bir bölüm planlayıcısı değil.

## Kullanıcı akışı

1. Dizi oluştur: ad, görsel stil, en-boy oranı ve karakter/mekân referanslarını kaydet.
2. Karakterleri tanımla: ad, açıklama, onaylı referans görselleri ve ses profili. Her çekimde karakter kimliği korunmalı.
3. Bölüm ekle: senaryoyu yapıştır veya dosyadan içe aktar. Orijinal metni sakla.
4. Metni sahnelere, sahne yönergelerine ve konuşmacı etiketli repliklere ayır. Kullanıcı sonucu düzenleyip onaylasın; belirsiz konuşmacı ve karakter eşleşmeleri işaretlensin.
5. Sahne bazında çekim planı oluştur: kadraj, süre, oyuncular, mekân, kaynak görsel ve ilgili replikler. Gerçekleşen konuşma süresine göre uzun replikleri uygun çekimlere böl.
6. Üretim öncesi tahmini maliyet ve iş kapsamını göster. Tek sahneyi veya onaylanan seçimi üret; hatalı çekimi bölümün tamamını yeniden üretmeden değiştir.
7. Seçili karakter sesleriyle replikleri üret; her kayıt için süreyi ve sürümü sakla. Konuşma referansına göre dudak senkronizasyonu uygula ve önizlemeyi kontrol et.
8. Onaylanan çekimleri, sesleri, müziği ve ortam seslerini kurguya yerleştir. Ses seviyelerini ve geçişleri düzenle; bölümün önizlemesini ve dışa aktarılmış sonucunu sun.

## Pilot kapsamı ve kabul koşulları

- Görselde soldan sağa Halil, İlo, Memo, Kayser, Seydo; Memo ortada.
- İlk replik: “Arkadaşlar, size ciddi bir şey söyleyeceğim. Biz beş kişi neden hâlâ kendi işimizi kurmuyoruz?”
- Bir bölüm metni içe alınır; sahne sınırı, yönerge, konuşmacı ve replik düzenlenebilir biçimde görünür ve orijinal metin korunur.
- Referanslar ve kullanıcı düzeltmeleri proje içinde kalıcıdır; başka kullanıcılar erişemez.
- Tek bir çekim üzerinde ses ve görüntü üretilip ayrı ayrı önizlenebilir. İş durumu, hata ve tahmini/gerçekleşen maliyet açıkça görünür; yinelenen istekler gereksiz ikinci ücretlendirme başlatmaz.
- Dudak senkronizasyonu ve karakter benzerliği gerçek çıktıyla değerlendirilir. Henüz desteklenmeyen özellikler tamamlanmış gibi gösterilmez.
- Onaylanmış çekim ve ses, kurguya eklenir ve dışa aktarımın ses/görüntü eşleşmesi doğrulanır.

## Uygulama sırası

1. Dizi/bölüm/karakter/sahne/çekim/replik/veri varlığı modelleri, kullanıcıya ait kalıcı kayıtlar ve senaryo içe aktarma ekranı.
2. Türkçe senaryo ayrıştırma, düzenleme ve hata bildirimleri; örnek senaryoyla doğrulama.
3. Mevcut yükleme ve üretim yollarını çekimlere bağlama; iş kuyruğu, durum, yeniden deneme, idempotensi ve kredi mutabakatı.
4. Karakter başına ses profili, replik sesleri ve uygun dudak eşleştirme sağlayıcısının prototip ile kalite, dil, çizgi karakter ve maliyet açısından doğrulanması.
5. Kurgu, ses miksajı, render, altyazı ve dışa aktarım; başarısız işlerin güvenli biçimde devam ettirilmesi.

## Açık teknik kararlar

- Ses ve dudak eşleştirme sağlayıcısı; Türkçe ve olası Kürtçe lehçelerde kalite, gecikme, maliyet ve lisans koşulları gerçek örneklerle değerlendirilmeli.
- Mevcut üreticilerin karakter ve mekân tutarlılığı ölçülmeli; gerekirse referans görseller, çekim başına yüz doğrulama ve kullanıcı onayı eklenmeli.
- Bölüm uzunluğu yalnızca hedef süreden varsayılmamalı; seslendirme ve çekim süreleri ölçülerek hesaplanmalı.
- Uzun süreli render ve üretimler sunucu isteğinin süresine bağlı kalmayan dayanıklı işler olarak tasarlanmalı.
- Dış servislerin platform içinde kullanılması mümkündür; kullanıcı için tek arayüz olması, altyapının mutlaka tüm modelleri kendi başına çalıştırdığı anlamına gelmez.
