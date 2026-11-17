(function () {
  'use strict';
  var language = 'en';
  try { language = localStorage.getItem('luofu-language') === 'ar' ? 'ar' : 'en'; } catch (_) {}
  var dictionary = {
    'Shop by gender':'تسوق حسب الجنس',
    'Where style meets comfort and health':'حيث تلتقي الأناقة بالراحة والصحة',
    'Experience the perfect blend of modern design, ergonomic and orthopedic support, and all-day comfort with LUOFU slippers. Crafted to enhance both your health and style, these slippers provide arch support, shock absorption, and a breathable fit—designed to keep your feet feeling great and looking stylish.':'استمتع بمزيج مثالي من التصميم العصري والدعم المريح للقدمين والراحة طوال اليوم مع شباشب LUOFU. صُممت لتعزيز صحتك وأناقتك، فهي توفر دعماً لقوس القدم وامتصاصاً للصدمات وتهوية مريحة، لتمنح قدميك شعوراً رائعاً ومظهراً أنيقاً.',
    'LUOFU slide feature diagram: ergonomic design, premium material, ventilation, antibacterial properties, durability, affordability, health benefits, slip resistance, style, lightweight comfort and quick drying.':'رسم توضيحي لمزايا شبشب LUOFU: تصميم مريح، خامة فاخرة، تهوية، خصائص مضادة للبكتيريا، متانة، سعر مناسب، فوائد صحية، مقاومة الانزلاق، أناقة، خفة وراحة، وسرعة الجفاف.',
    'LUOFU slipper features':'مزايا شبشب LUOFU',
    'Ergonomic design':'تصميم مريح', 'Premium material':'خامة فاخرة',
    'Ventilated':'جيد التهوية', 'Antibacterial':'مضاد للبكتيريا',
    'Durable':'متين', 'Affordable':'سعر مناسب',
    'Health benefits':'فوائد صحية', 'Slip-resistant':'مقاوم للانزلاق',
    'Stylish':'أنيق', 'Lightweight':'خفيف الوزن',
    'Comfortable':'مريح', 'Quick-drying':'سريع الجفاف',
    'Catalogue':'الكتالوج','Men':'رجال','Women':'نساء',"Men's":'رجالي',"Women's":'نسائي',
    'About':'من نحن','All':'الكل','All models':'جميع الموديلات','All categories':'جميع الفئات',
    'Slippers':'شباشب','Slides':'شباشب مفتوحة','Chappals':'شباشب بإصبع','Sandals':'صنادل','Clogs':'قباقيب',
    'Browse catalogue':'تصفح الكتالوج','Shop by category':'تسوق حسب الفئة','Browse all models':'تصفح جميع الموديلات',
    'View range':'تصفح المجموعة','View details':'عرض التفاصيل','Back to catalogue':'العودة إلى الكتالوج',
    'Best sellers':'الأكثر مبيعاً','Best seller':'الأكثر مبيعاً',
    'Favourites':'المفضلة','Your selection':'اختياراتك','Continue shopping':'متابعة التسوق',
    'No favourites yet':'لا توجد منتجات مفضلة بعد','Save the styles you love to compare them later.':'احفظ التصاميم التي تحبها لمقارنتها لاحقاً.',
    'Added to favourites':'تمت الإضافة إلى المفضلة','Removed from favourites':'تمت الإزالة من المفضلة',
    'Saved on this device.':'محفوظة على هذا الجهاز.','Saved to your account.':'محفوظة في حسابك.',
    'Syncing your favourites…':'جارٍ مزامنة المفضلة…','Saving your favourites…':'جارٍ حفظ المفضلة…','Retry sync':'إعادة المزامنة',
    'Saved on this device. Account sync is unavailable; retry when connected.':'محفوظة على هذا الجهاز. مزامنة الحساب غير متاحة؛ أعد المحاولة عند الاتصال.',
    'Favourites are saved for this visit. Browser storage is unavailable.':'المفضلة محفوظة لهذه الزيارة. تخزين المتصفح غير متاح.',
    'Open favourites':'فتح المفضلة','Close size guide':'إغلاق دليل المقاسات','Account':'الحساب','Cart':'السلة',
    'Requested EU size':'المقاس الأوروبي المطلوب','Size availability is confirmed on WhatsApp.':'يتم تأكيد توفر المقاس عبر واتساب.',
    'Sizes and colour availability are confirmed when you order.':'يتم تأكيد توفر المقاسات والألوان عند الطلب.',
    'Price on request':'السعر عند الطلب','Unavailable':'غير متوفر','Ask about availability':'استفسر عن التوفر',
    'Video':'فيديو','Video available in gallery':'فيديو متاح في معرض المنتج','Product media':'صور وفيديو المنتج','Product details':'تفاصيل المنتج',
    'Video unavailable. Please choose another image.':'الفيديو غير متاح. يرجى اختيار صورة أخرى.','Image unavailable':'الصورة غير متاحة',
    'Loading the collection…':'جارٍ تحميل المجموعة…','Please check your connection and try again.':'يرجى التحقق من الاتصال والمحاولة مرة أخرى.','Try again':'حاول مرة أخرى',
    'Some collection photos could not load. Refresh to try again.':'تعذر تحميل بعض صور المجموعة. أعد تحميل الصفحة للمحاولة.',
    'Delivery and availability are confirmed on WhatsApp. No payment is taken here.':'يتم تأكيد التوصيل والتوفر عبر واتساب. لا يتم الدفع هنا.',
    'Analytics preferences':'تفضيلات التحليلات','Size guide':'دليل المقاسات',
    'EU size':'المقاس الأوروبي','UK size':'المقاس البريطاني','Foot length (cm)':'طول القدم (سم)',
    'EU, UK and foot length in centimetres.':'المقاسات الأوروبية والبريطانية وطول القدم بالسنتيمتر.',
    'Place your foot flat on paper. Mark your heel and longest toe, then measure between the marks in centimetres. If between sizes, choose the larger size.':'ضع قدمك بشكل مسطح على ورقة. حدد الكعب وأطول إصبع، ثم قس المسافة بين العلامتين بالسنتيمتر. إذا كان قياسك بين مقاسين، فاختر المقاس الأكبر.',
    'Size guide only. Confirm availability for your model on WhatsApp.':'هذا دليل للمقاسات فقط. تأكد من توفر مقاس موديلك عبر واتساب.',
    'View original size guide':'عرض دليل المقاسات الأصلي','Choose your size':'اختر مقاسك','Choose EU size':'اختر المقاس الأوروبي',
    'Brand':'العلامة التجارية','Range':'المجموعة','Category':'الفئة','Material':'الخامة','Choose colour':'اختر اللون',
    'Add to cart':'أضف إلى السلة','Added to cart':'تمت الإضافة إلى السلة','Order on WhatsApp':'اطلب عبر واتساب',
    'Choose your colour and EU size before ordering.':'اختر اللون والمقاس الأوروبي قبل الطلب.',
    'Please choose a colour first.':'يرجى اختيار اللون أولاً.','Please choose an EU size first.':'يرجى اختيار المقاس الأوروبي أولاً.',
    'Add your favourites to cart and checkout on WhatsApp.':'أضف منتجاتك المفضلة إلى السلة وأكمل طلبك عبر واتساب.',
    'Search the catalogue':'ابحث في الكتالوج','Search model, colour, category…':'ابحث عن موديل أو لون أو فئة…',
    'Clear search':'مسح البحث','Reset filters':'إعادة ضبط الفلاتر','No models match your search.':'لا توجد موديلات تطابق بحثك.',
    'Your cart':'سلتك','Your cart is empty. Add a product to get started.':'سلتك فارغة. أضف منتجاً للبدء.',
    'Confirm colours, availability and prices with us on WhatsApp.':'تأكد معنا من الألوان والتوفر والأسعار عبر واتساب.',
    'Confirm colours, availability and prices on WhatsApp.':'تأكد من الألوان والتوفر والأسعار عبر واتساب.',
    'Checkout on WhatsApp':'أكمل الطلب عبر واتساب','Continue shopping':'متابعة التسوق','Close cart':'إغلاق السلة','Remove':'إزالة',
    'Choose colour and size':'اختر اللون والمقاس','Confirm colour on WhatsApp':'أكد اللون عبر واتساب',
    'Collection':'المجموعة',"Men's film":'فيديو الرجال',"Women's film":'فيديو النساء',
    'Pause slideshow':'إيقاف العرض مؤقتاً','Play slideshow':'تشغيل العرض',
    'LUOFU / MEN':'LUOFU / رجال','LUOFU / WOMEN':'LUOFU / نساء',
    'Comfort for every step.':'راحة في كل خطوة.', 'Your everyday favourites.':'خياراتك المفضلة لكل يوم.',
    "Explore men's":'اكتشف مجموعة الرجال',"Explore women's":'اكتشف مجموعة النساء',
    'Shop':'تسوق','Information':'معلومات','Contact':'تواصل معنا','About the catalogue':'عن الكتالوج',
    'About this catalogue':'عن هذا الكتالوج','Notes':'ملاحظات','The LUOFU range':'مجموعة LUOFU',
    'One catalogue.':'كتالوج واحد.','Every model, every colourway.':'كل موديل، وكل لون.',
    'Each entry lists the model code, range and available colourways exactly as recorded in the LUOFU catalogue.':'يعرض كل منتج رمز الموديل والمجموعة والألوان المتاحة كما وردت في كتالوج LUOFU.',
    'This is a product reference site for the LUOFU footwear range. It shows the model code, range, category, material and colourways held in the master catalogue. Add products to your cart and send your order on WhatsApp to confirm colours, availability and pricing.':'هذا موقع لعرض أحذية LUOFU. يعرض رمز الموديل والمجموعة والفئة والخامة والألوان الواردة في الكتالوج. أضف المنتجات إلى سلتك وأرسل طلبك عبر واتساب لتأكيد الألوان والتوفر والأسعار.',
    'Product details are shown only where they exist in the source catalogue — nothing is estimated.':'نعرض تفاصيل المنتجات المتوفرة في الكتالوج الأصلي فقط.',
    'Every model is grouped into one of five categories: Slippers, Slides, Chappals, Sandals or Clogs.':'تضم المجموعة شباشب وشباشب مفتوحة وشباشب بإصبع وصنادل وقباقيب.',
    'Colourway availability can change; confirm the colour you want with us on WhatsApp when you order.':'قد يتغير توفر الألوان؛ أكد اللون المطلوب معنا عبر واتساب عند الطلب.',
    'Chappals, slides and sandals for every day. Order on WhatsApp.':'شباشب وصنادل لكل يوم. اطلب عبر واتساب.',
    'Product catalogue for reference.':'كتالوج المنتجات للعرض.', 'LUOFU Qatar. All rights reserved.':'LUOFU قطر. جميع الحقوق محفوظة.',
    'Reference image from the source catalogue — high-resolution photography pending.':'صورة مرجعية من الكتالوج الأصلي؛ الصور عالية الدقة غير متوفرة بعد.',
    'Skip to catalogue':'انتقل إلى الكتالوج','Open menu':'فتح القائمة','Close menu':'إغلاق القائمة','Close product detail':'إغلاق تفاصيل المنتج',
    'Choose a banner':'اختر لافتة','LUOFU collection':'مجموعة LUOFU',
    "Men's collection video":'فيديو مجموعة الرجال',"Women's collection video":'فيديو مجموعة النساء',
    'Filter by range':'تصفية حسب المجموعة','Filter by category':'تصفية حسب الفئة',
    'Primary':'التنقل الرئيسي','Mobile':'قائمة الهاتف','Shop by range':'تسوق حسب المجموعة','About the range':'عن المجموعة',
    'No image':'لا توجد صورة','LUOFU — Footwear Catalogue':'LUOFU — كتالوج الأحذية',
    'LUOFU footwear catalogue — comfort for every step':'كتالوج أحذية LUOFU — راحة في كل خطوة',
  };
  Object.assign(dictionary, {
    'Play':'تشغيل', 'Pause':'إيقاف مؤقت', 'Mute':'كتم الصوت', 'Unmute':'تشغيل الصوت',
    'Play video':'تشغيل الفيديو', 'Pause video':'إيقاف الفيديو مؤقتًا',
    'Mute video':'كتم صوت الفيديو', 'Unmute video':'تشغيل صوت الفيديو',
    'Volume':'مستوى الصوت', 'Loading video…':'جارٍ تحميل الفيديو…',
    'Buffering video…':'جارٍ تخزين الفيديو مؤقتًا',
    'Video playing':'الفيديو قيد التشغيل', 'Video paused':'الفيديو متوقف مؤقتًا',
    'Video unavailable. Select Play to retry.':'الفيديو غير متاح. اضغط تشغيل للمحاولة مجددًا.',
    'Playback blocked. Select Play to try again.':'تعذر بدء تشغيل الفيديو. اضغط تشغيل للمحاولة مجددًا.',
    'Use your device volume buttons.':'استخدم أزرار الصوت في جهازك.'
  });
  var descriptions = [
    ['Soft everyday slipper with a crossover strap upper, made in EVA.','شبشب يومي ناعم بأشرطة متقاطعة، مصنوع من EVA.'],
    ["Everyday men's sandal with a crossover strap upper for relaxed daily wear.",'صندل رجالي بأشرطة متقاطعة للارتداء اليومي المريح.'],
    ["Lightweight men's slide designed for comfortable daily wear.",'شبشب رجالي خفيف مصمم للراحة اليومية.'],
    ["Women's crossover slide on a raised platform sole for easy everyday wear.",'شبشب نسائي بأشرطة متقاطعة ونعل مرتفع للارتداء اليومي.'],
    ["Simple women's slide with a wide band, made for comfortable daily wear.",'شبشب نسائي بسيط بشريط عريض للراحة اليومية.'],
    ["Men's slide with a twin-band upper for relaxed everyday wear.",'شبشب رجالي بشريطين للارتداء اليومي المريح.'],
    ["Men's sandal with a multi-strap upper for casual daily wear.",'صندل رجالي متعدد الأشرطة للاستخدام اليومي.'],
    ["Women's slide with a textured band upper for everyday wear.",'شبشب نسائي بشريط ذي ملمس بارز للارتداء اليومي.'],
    ["Women's toe-post chappal on a low wedge sole for everyday wear.",'شبشب نسائي بإصبع ونعل إسفيني منخفض للارتداء اليومي.'],
    ["Lightweight women's slide with a wide band, suitable for daily wear.",'شبشب نسائي خفيف بشريط عريض مناسب للارتداء اليومي.'],
    ["Women's closed-toe clog with cut-out detailing for relaxed daily use.",'قبقاب نسائي مغلق من الأمام بتفاصيل مفرغة للاستخدام اليومي المريح.'],
    ["Women's crossover slide for comfortable everyday wear.",'شبشب نسائي بأشرطة متقاطعة للراحة اليومية.'],
    ["Women's slide with twin straps for simple everyday wear.",'شبشب نسائي بشريطين للارتداء اليومي.'],
    ["Women's slide with a decorative band, made for easy daily wear.",'شبشب نسائي بشريط مزخرف للارتداء اليومي.'],
    ["Casual women's chappal with a simple toe-post profile.",'شبشب نسائي كاجوال بتصميم بسيط بإصبع.'],
    ["Women's slide with a wide sports-style band for everyday wear.",'شبشب نسائي بشريط عريض بتصميم رياضي للارتداء اليومي.'],
    ["Women's sandal with a back-strap design for everyday wear.",'صندل نسائي بشريط خلفي للارتداء اليومي.'],
    ['Casual chappal with a simple toe-post profile for everyday wear.','شبشب كاجوال بتصميم بسيط بإصبع للارتداء اليومي.'],
    ["Women's slide with a twin-band upper for comfortable daily wear.",'شبشب نسائي بشريطين للراحة اليومية.'],
    ["Women's two-band slide with a buckle detail for everyday wear.",'شبشب نسائي بشريطين وإبزيم للارتداء اليومي.'],
    ["Women's slide with a twin-band upper, made for easy daily wear.",'شبشب نسائي بشريطين للارتداء اليومي.'],
    ["Women's slide with a bow detail on the band for everyday wear.",'شبشب نسائي بشريط مزين بفيونكة للارتداء اليومي.'],
    ["Women's slide with a soft wide band for comfortable daily wear.",'شبشب نسائي بشريط عريض ناعم للراحة اليومية.'],
    ["Men's slide with a wide band upper for relaxed everyday wear.",'شبشب رجالي بشريط عريض للارتداء اليومي المريح.'],
    ["Women's slide with a perforated band for easy daily wear.",'شبشب نسائي بشريط مثقب للارتداء اليومي.'],
    ["Men's sports-style slide designed for comfortable daily wear.",'شبشب رجالي بتصميم رياضي للراحة اليومية.'],
    ["Men's slide with a perforated band for relaxed everyday wear.",'شبشب رجالي بشريط مثقب للارتداء اليومي المريح.'],
    ["Women's slide with a buckle-trimmed band for everyday wear.",'شبشب نسائي بشريط مزين بإبزيم للارتداء اليومي.'],
    ["Comfortable women's clog suitable for relaxed daily use.",'قبقاب نسائي مريح مناسب للاستخدام اليومي.'],
    ["Casual men's chappal with a simple toe-post profile.",'شبشب رجالي كاجوال بتصميم بسيط بإصبع.'],
    ["Men's toe-post chappal with a lightweight sole for casual wear.",'شبشب رجالي بإصبع ونعل خفيف للاستخدام اليومي.'],
    ["Men's slide on a thicker sole for relaxed everyday wear.",'شبشب رجالي بنعل سميك للارتداء اليومي المريح.'],
    ["Women's slide with a perforated twin band for everyday wear.",'شبشب نسائي بشريطين مثقبين للارتداء اليومي.'],
    ["Men's crossover slide designed for comfortable daily wear.",'شبشب رجالي بأشرطة متقاطعة للراحة اليومية.'],
    ["Women's chappal with a slim toe-post upper for casual daily wear.",'شبشب نسائي بأشرطة رفيعة وإصبع للاستخدام اليومي.'],
    ["Casual men's chappal with a simple everyday profile.",'شبشب رجالي كاجوال بتصميم يومي بسيط.'],
    ["Men's slide with a twin-band upper for comfortable daily wear.",'شبشب رجالي بشريطين للراحة اليومية.']
  ];
  descriptions.forEach(function(pair){dictionary[pair[0]]=pair[1];});
  var names = {'Crossover Comfort Slipper':'شبشب مريح بأشرطة متقاطعة','Crossover Strap Sandal':'صندل بأشرطة متقاطعة','Single-Band Slide':'شبشب بشريط واحد','Crossover Platform Slide':'شبشب مرتفع بأشرطة متقاطعة','Everyday Slide':'شبشب يومي','Two-Band Slide':'شبشب بشريطين','Multi-Strap Sandal':'صندل متعدد الأشرطة','Textured Band Slide':'شبشب بشريط بارز الملمس','Wedge Chappal':'شبشب بنعل إسفيني','Wide-Band Slide':'شبشب بشريط عريض','Cut-Out Clog':'قبقاب مفرغ','Crossover Slide':'شبشب بأشرطة متقاطعة','Twin-Strap Slide':'شبشب بشريطين','Floral Band Slide':'شبشب بشريط مزخرف','Everyday Chappal':'شبشب يومي بإصبع','Sport Band Slide':'شبشب رياضي','Back-Strap Sandal':'صندل بشريط خلفي','Toe-Post Chappal':'شبشب بإصبع','Twin-Band Slide':'شبشب بشريطين','Buckle Slide':'شبشب بإبزيم','Bow Detail Slide':'شبشب بفيونكة','Soft Band Slide':'شبشب بشريط ناعم','Perforated Slide':'شبشب مثقب','Sport Slide':'شبشب رياضي','Buckle Band Slide':'شبشب بشريط وإبزيم','Everyday Clog':'قبقاب يومي','Beach Chappal':'شبشب للشاطئ','Chunky Sole Slide':'شبشب بنعل سميك','Perforated Band Slide':'شبشب بشريط مثقب','Slim Toe-Post Chappal':'شبشب بإصبع وأشرطة رفيعة','Classic Clog':'قبقاب كلاسيكي'};
  Object.keys(names).forEach(function(key){dictionary[key]=names[key];dictionary["Men's "+key]=names[key]+' رجالي';dictionary["Women's "+key]=names[key]+' نسائي';});
  Object.assign(dictionary, {
    'Stripe Detail Slide': 'شبشب بتفاصيل مخططة', 'Cut-Out Slide': 'شبشب بتفاصيل مفرغة', 'Speckled Sole Slide': 'شبشب بنعل منقط',
    'X – strap': 'إكس ستراب', 'Cross-Cut Slide': 'كروس كت سلايد', 'Elysia': 'إليسيا', 'Hiraam': 'هيرام', 'Kremlin – Mono': 'كرملين – مونو',
    "Women's Stripe Detail Slide": 'شبشب نسائي بتفاصيل مخططة', "Women's Cut-Out Slide": 'شبشب نسائي بتفاصيل مفرغة', "Men's Speckled Sole Slide": 'شبشب رجالي بنعل منقط',
    'Crossed straps and a contrasting sole give this everyday slip-on a clean, relaxed look.': 'أشرطة متقاطعة ونعل بلون متباين لإطلالة يومية بسيطة.',
    'Two shaped straps with a cut-out detail create an open, easy-to-wear silhouette.': 'شريطان بتفاصيل مفرغة لتصميم مفتوح وسهل الارتداء.',
    'A crossover upper and raised sole bring a simple finish to everyday outfits.': 'أشرطة متقاطعة ونعل مرتفع لإكمال إطلالتك اليومية.',
    'A broad, curved band and understated LUOFU lettering keep the look simple.': 'شريط عريض منحني وشعار LUOFU لإطلالة بسيطة.',
    'A closed-toe design with ventilation holes and a back strap for everyday casual wear.': 'تصميم مغلق من الأمام مع فتحات تهوية وشريط خلفي للاستخدام اليومي.',
    'A broad upper with a contrasting stripe detail and an open, slip-on shape.': 'جزء علوي عريض بتفاصيل مخططة متباينة وتصميم مفتوح سهل الارتداء.',
    'A single wide band with a buckle detail for a simple everyday look.': 'شريط عريض واحد بتفصيل إبزيم لإطلالة يومية بسيطة.',
    'An open-toe design with intersecting straps and cut-out detailing.': 'تصميم مفتوح من الأمام بأشرطة متقاطعة وتفاصيل مفرغة.',
    'Overlapping straps create a clean, open-toe silhouette for everyday wear.': 'أشرطة متداخلة وتصميم مفتوح من الأمام للارتداء اليومي.',
    'Two broad bands with a contrasting stripe detail for an easy everyday look.': 'شريطان عريضان بتفاصيل مخططة متباينة لإطلالة يومية بسيطة.',
    'A plain wide band contrasts with a speckled sole for a distinctive everyday look.': 'شريط عريض بسيط مع نعل منقط لإطلالة يومية مميزة.',
    'Playback could not start. Tap play to try again.': 'تعذر بدء التشغيل. اضغط تشغيل للمحاولة مجدداً.',
    'Search styles, colours…': 'ابحث عن التصاميم والألوان…',
    'Find your everyday pair.': 'اعثر على حذائك اليومي.',
    'Explore the collection, save your favourites and choose the colours you love.': 'اكتشف المجموعة واحفظ مفضلاتك واختر الألوان التي تحبها.',
    'Discover the LUOFU footwear collection for men and women. Add your favourite styles to the cart, then send your selection on WhatsApp to confirm sizes, colours, availability and delivery.': 'اكتشف مجموعة أحذية LUOFU للرجال والنساء. أضف تصاميمك المفضلة إلى السلة، ثم أرسل اختيارك عبر واتساب لتأكيد المقاسات والألوان والتوفر والتوصيل.',
    'Displayed prices are in Qatari riyals (QAR). Ask us about styles without a listed price.': 'الأسعار المعروضة بالريال القطري. استفسر منا عن التصاميم التي لا يظهر لها سعر.',
    'LUOFU collection. Swipe or use left and right arrow keys to explore.': 'مجموعة LUOFU. اسحب أو استخدم مفتاحي السهم الأيسر والأيمن للتصفح.'
  });
  function translate(value) {
    if(typeof value!=='string')return value;
    var clean=value.replace(/\s+/g,' ').trim();
    if(dictionary[clean]) return dictionary[clean];
    if(/^Showing all \d+ models$/.test(clean))return 'عرض جميع الموديلات: '+clean.match(/\d+/)[0];
    if(/^Showing \d+ of \d+ models$/.test(clean)){var nums=clean.match(/\d+/g);return 'عرض '+nums[0]+' من '+nums[1]+' موديل';}
    if(/^\d+ colours?$/.test(clean))return clean.match(/\d+/)[0]+' ألوان';
    if(clean==='models')return 'موديل';
    if(/^\d+ items? in your cart/.test(clean))return clean.match(/\d+/)[0]+' منتجات في سلتك'+(clean.includes('choose colour')?' — اختر اللون والمقاس لإكمال الطلب.':'');
    if(/^Open cart,/.test(clean))return 'فتح السلة، '+(clean.match(/\d+/)||['0'])[0]+' منتجات';
    var result=value;
    if (/^(Image|Video) \d+ of \d+$/.test(clean)) { var mediaNumbers = clean.match(/\d+/g); return (clean.startsWith('Image') ? 'الصورة ' : 'الفيديو ') + mediaNumbers[0] + ' من ' + mediaNumbers[1]; }
    if (/^Show (image|video) \d+ of \d+$/.test(clean)) { var showNumbers = clean.match(/\d+/g); return (clean.includes('image') ? 'عرض الصورة ' : 'عرض الفيديو ') + showNumbers[0] + ' من ' + showNumbers[1]; }
    result=result.replace(/^Add to favourites: /,'إضافة إلى المفضلة: ').replace(/^Remove from favourites: /,'إزالة من المفضلة: ');
    result=result.replace(/^Product subtotal: /,'المجموع الفرعي للمنتجات: ').replace(/ each$/,' للقطعة');
    // Keep model codes, named colourways and EU/UK size identifiers unchanged.
    result=result.replace(/LUOFU Women's/g,'LUOFU نسائي').replace(/LUOFU Men's/g,'LUOFU رجالي');
    result=result.replace(/\bModel /g,'الموديل ').replace(/Size: EU /g,'المقاس: EU ');
    result=result.replace(/^Selected: /,'المحدد: ').replace(/^Save favourite /,'حفظ في المفضلة ').replace(/^Remove favourite /,'إزالة من المفضلة ');
    result=result.replace(/^Product video: /,'فيديو المنتج: ').replace(/^View details for /,'عرض تفاصيل ').replace(/, model /, '، الموديل ');
    result=result.replace(/^Decrease quantity for /,'تقليل كمية ').replace(/^Increase quantity for /,'زيادة كمية ');
    result=result.replace(/ added to cart\.$/,' تمت إضافته إلى السلة.').replace(/ removed from cart\.$/,' تمت إزالته من السلة.').replace(/ updated in cart\.$/,' تم تحديثه في السلة.');
    result=result.replace(/LUOFU Qatar\. All rights reserved\./,'LUOFU قطر. جميع الحقوق محفوظة.');
    if(clean.includes(' · '))result=clean.split(' · ').map(function(part){return dictionary[part]||part;}).join(' · ');
    return result;
  }
  window.LuofuI18n={language:language,t:translate};
  document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';
  var toggle=document.getElementById('languageToggle');
  toggle.textContent=language==='ar'?'English':'العربية';toggle.lang=language==='ar'?'en':'ar';
  toggle.setAttribute('aria-label',language==='ar'?'Switch to English':'Switch to Arabic');
  toggle.onclick=function(){try{localStorage.setItem('luofu-language',language==='ar'?'en':'ar');location.reload();}catch(_){document.documentElement.lang='ar';document.documentElement.dir='rtl';localize(document.body);}};
  function localize(root) {
    if(root.nodeType===3){var next=translate(root.nodeValue);if(next!==root.nodeValue)root.nodeValue=next;return;}
    if(root.nodeType!==1 || /^(SCRIPT|STYLE|CODE)$/.test(root.tagName) || root===toggle)return;
    ['aria-label','placeholder','alt','title'].forEach(function(attr){if(root.hasAttribute(attr)){var old=root.getAttribute(attr),next=translate(old);if(next!==old)root.setAttribute(attr,next);}});
    Array.from(root.childNodes).forEach(localize);
  }
  if(language==='ar'){
    document.title=translate(document.title);localize(document.body);
    new MutationObserver(function(records){records.forEach(function(record){
      if(record.type==='childList')record.addedNodes.forEach(localize);else localize(record.target);
    });}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','alt','title']});
  }
})();
