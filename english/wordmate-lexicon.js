/* WordMate supplemental lexical notes. Preserve the seed IDs and learning history. */
(function(){
"use strict";
const sets=[
 {id:"D",title:"Daily Life",description:"Everyday conversation & discussion",icon:"☕"},
 {id:"B",title:"Business",description:"Meetings, emails, sales & trade",icon:"💼"},
 {id:"T",title:"TOEIC",description:"B2–C1 vocabulary & grammar",icon:"📘"}
];
window.LEXICON_SETS=sets;
const posGroups={
 adjective:"hesitant|overwhelming|familiar|vulnerable|stumped|awkward|feasible|viable|outstanding|prospective|subsequent|prior|adequate|eligible|mandatory|comprehensive|preliminary|tentative|consecutive|concurrent|revised|designated|applicable|compliant",
 verb:"juggle|diminish|negotiate|coordinate|facilitate|align|streamline|allocate|leverage|retain|implement|acquire|authorize|reimburse|comply|outline|accommodate",
 adverb:"approximately|considerably|relatively|respectively|accordingly|substantially|consistently",
 "phrasal-verb":"ramp up",
 noun:"contingency|stakeholder|incentive|margin|facilities|premises|inventory|procurement|discrepancy|shortage|surplus|revenue|expenditure|settlement|nuance|perspective|trade-off|assumption|quotation|specification|consignment|distributor|wholesaler|fabric hand|dyeing|customs clearance|certificate of origin|minimum order quantity|replenishment|commission"
};
const posMap={};Object.entries(posGroups).forEach(([p,terms])=>terms.split("|").forEach(term=>posMap[term]=p));
const senseData={
 "familiar":[
  ["よく知っている・慣れている","I'm familiar with this company's products.","私はこの会社の製品をよく知っています。","be familiar with + 内容"],
  ["見覚えがある・聞き覚えがある","That name sounds familiar to me.","その名前には聞き覚えがあります。","be familiar to + 人"]
 ],
 "vulnerable":[
  ["影響を受けやすい・傷つきやすい","Small businesses are vulnerable to sudden cost increases.","中小企業は突然のコスト上昇の影響を受けやすいです。","vulnerable to + 名詞"],
  ["弱い立場にある・保護が必要な","We should protect vulnerable customers from fraud.","弱い立場の顧客を詐欺から守るべきです。","vulnerable people という使い方"]
 ],
 "juggle":[
  ["複数の仕事・責任をやりくりする","I juggle sales work, USCPA study and English practice.","営業の仕事とUSCPAの勉強と英語練習を両立しています。","juggle A and B / juggle multiple tasks"],
  ["物をジャグリングする","He can juggle three balls at once.","彼は3つのボールを同時にジャグリングできます。","文字どおりの意味"]
 ],
 "overwhelming":[
  ["圧倒的な・非常に強い","There was overwhelming support for the proposal.","その提案には圧倒的な支持が集まりました。","overwhelming support / evidence"],
  ["負担が大きすぎる・手に余る","The amount of new information was overwhelming.","新しい情報量が多すぎて圧倒されました。","人の感情には overwhelmed"]
 ],
 "coordinate":[
  ["人や業務を調整する","I'll coordinate with the factory and logistics team.","工場と物流チームと調整します。","coordinate with + 人"],
  ["複数の活動を連携させる","She coordinated the launch across three countries.","彼女は3か国にまたがる発売を統括しました。","coordinate a project / effort"]
 ],
 "align":[
  ["意見・方針・条件を一致させる","We need to align on the delivery schedule.","納期について認識を合わせる必要があります。","align on + 合意事項"],
  ["位置や向きをそろえる","Please align the logo with the center of the label.","ロゴをラベルの中央に合わせてください。","align A with B"]
 ],
 "leverage":[
  ["強みや資産を活用する","We can leverage our distribution network in the Gulf.","湾岸地域の販売網を活用できます。","leverage our experience / network"],
  ["てこの作用を利用する・レバレッジをかける","The company leveraged its assets to fund the expansion.","その会社は資産を担保に資金を調達して事業を拡大しました。","金融では借入による投資拡大にも使う"]
 ],
 "incentive":[
  ["動機・誘因","A higher commission provides an incentive to sell more.","高い手数料が販売増加の動機になります。","an incentive to + 動詞"],
  ["報奨金・優遇措置","The government offers tax incentives to investors.","政府は投資家に税優遇措置を提供しています。","tax incentive / sales incentive"]
 ],
 "margin":[
  ["利益率・利幅","We need a higher profit margin on this product.","この製品ではもっと高い利益率が必要です。","profit margin は営業利益率とは限らない"],
  ["差・余裕","We have very little margin for error.","間違いが許される余地はほとんどありません。","margin for error"],
  ["ページや布などの端・余白","Leave a wider margin around the printed design.","印刷デザインの周囲に広めの余白を残してください。","page margin / margin"]
 ],
 "outstanding":[
  ["未払いの・未処理の","We still have an outstanding payment from the customer.","顧客からの未払い代金が残っています。","outstanding invoice / balance"],
  ["際立って優れた","She did an outstanding job on the presentation.","彼女はプレゼンで素晴らしい仕事をしました。","outstanding performance"]
 ],
 "prior":[
  ["以前の・前の","I had no prior experience in the textile industry.","私は以前、繊維業界での経験がありませんでした。","prior experience"],
  ["〜より前に（prior to）","Please confirm the details prior to shipment.","出荷前に詳細を確認してください。","prior to + 名詞／動名詞"]
 ],
 "accordingly":[
  ["それに応じて","Demand has changed, so we adjusted production accordingly.","需要が変わったため、それに応じて生産を調整しました。","状況に合わせた対応"],
  ["したがって・その結果","The shipment is delayed. Accordingly, the arrival date will change.","船積みが遅れています。したがって到着日も変更されます。","フォーマルな接続副詞"]
 ],
 "respectively":[
  ["それぞれ（列挙した順に）","The prices are $20 and $30, respectively.","価格はそれぞれ20ドルと30ドルです。","対応する順序が重要"]
 ],
 "implement":[
  ["計画・制度を実行する","The company will implement a new pricing policy.","会社は新しい価格方針を実施します。","implement a plan / policy"],
  ["システム・仕組みを導入する","We plan to implement a new inventory management system.","新しい在庫管理システムを導入する予定です。","implementation は名詞"]
 ],
 "acquire":[
  ["取得する・手に入れる","The company acquired additional warehouse space.","会社は追加の倉庫スペースを取得しました。","acquire assets"],
  ["企業を買収する","The group acquired a smaller competitor.","そのグループは小規模な競合会社を買収しました。","acquisition（買収）"],
  ["知識や技能を身につける","It takes practice to acquire natural expressions.","自然な表現を身につけるには練習が必要です。","acquire a skill"]
 ],
 "outline":[
  ["概要を説明する（動詞）","The proposal outlines our expansion strategy.","提案書は事業拡大戦略の概要を説明しています。","outline a plan"],
  ["概要・大枠（名詞）","Could you send me an outline of the project?","プロジェクトの概要を送っていただけますか。","an outline of + 名詞"]
 ],
 "accommodate":[
  ["要望や変更に対応する","We can accommodate your request for a later delivery.","納期を遅らせるというご要望に対応できます。","accommodate a request"],
  ["人や物を収容する","The meeting room can accommodate 30 people.","その会議室は30人収容できます。","accommodate + 人数"]
 ],
 "inventory":[
  ["在庫・在庫品","We need to reduce excess inventory.","余剰在庫を削減する必要があります。","inventory management"],
  ["在庫の一覧・棚卸し","We conduct a physical inventory every year.","毎年実地棚卸しを行います。","physical inventory"]
 ],
 "surplus":[
  ["余剰・余剰分（名詞）","We have a surplus of finished goods.","製品の余剰在庫があります。","a surplus of + 名詞"],
  ["余っている・過剰な（形容詞）","The factory sold its surplus materials.","工場は余剰資材を販売しました。","surplus materials"]
 ],
 "settlement":[
  ["和解・示談","The two companies reached a reasonable settlement.","両社は妥当な和解に至りました。","reach a settlement"],
  ["決済・支払い処理","The bank completed the settlement of the transaction.","銀行はその取引の決済を完了しました。","payment settlement"]
 ],
 "consignment":[
  ["委託販売・委託","We sell the products on consignment at the shop.","その店で商品を委託販売しています。","on consignment"],
  ["委託貨物・託送品","The consignment arrived at the port yesterday.","その貨物は昨日港に到着しました。","shipment / consignment"]
 ],
 "commission":[
  ["販売手数料・紹介料","We can offer a five percent commission for introductions.","顧客紹介に対して5％の手数料をお支払いできます。","sales commission"],
  ["委員会・特別調査機関","The commission published its final report.","委員会は最終報告書を公表しました。","a government commission"]
 ],
 "quotation":[
  ["見積書・見積価格","Please send us a quotation for 5,000 yards.","5,000ヤード分の見積書をお送りください。","price quotation"],
  ["引用文・引用","The report begins with a quotation from the CEO.","その報告書はCEOの言葉の引用から始まります。","a quotation from"]
 ],
 "revised":[
  ["修正・改訂された","Please see the revised shipping schedule.","修正後の船積み予定表をご確認ください。","revised version"],
  ["考えを見直した（revise の過去分詞）","We revised our estimate after the meeting.","会議後に見積りを修正しました。","revise a forecast"]
 ],
 "eligible":[
  ["資格がある・対象となる","Employees are eligible for a bonus after six months.","従業員は6か月後から賞与の対象となります。","eligible for + 名詞"],
  ["〜する資格がある","Only registered members are eligible to apply.","登録会員だけが応募できます。","eligible to + 動詞"]
 ],
 "facilities":[
  ["設備・施設","The factory has modern production facilities.","工場には近代的な生産設備があります。","manufacturing facilities"],
  ["便宜設備・サービス","The hotel offers excellent meeting facilities.","そのホテルは優れた会議設備を備えています。","hotel facilities"]
 ],
 "direct":[
  ["直接の","Please contact me directly.","直接ご連絡ください。","directly は副詞"],
  ["指示する","The manager directed the team to review the figures.","マネージャーはチームに数字の見直しを指示しました。","direct someone to do"]
 ],
 "ramp up":[
  ["生産・供給を増強する","We need to ramp up production before the peak season.","繁忙期前に生産を増強する必要があります。","ramp up production"],
  ["活動や取り組みを強化する","We're ramping up our sales efforts in Oman.","オマーンでの営業活動を強化しています。","ramp up efforts"]
 ],
 "be subject to ...":[
  ["〜の対象となる","Prices are subject to change without notice.","価格は予告なく変更される場合があります。","subject to change"],
  ["〜に従う・〜を条件とする","The agreement is subject to final approval.","契約は最終承認を条件とします。","subject to approval"]
 ],
 "allow for ...":[
  ["〜を考慮に入れる","We should allow for possible shipping delays.","船積みの遅延の可能性を考慮すべきです。","allow for + 名詞"],
  ["〜のために時間・余裕を確保する","Allow extra time for customs clearance.","通関のために余裕を持った時間を確保してください。","allow extra time for"]
 ],
 "be well worth a visit":[
  ["訪れる価値が十分にある","The museum is well worth a visit.","その博物館は訪れる価値が十分にあります。","worth は形容詞。be worth + 名詞／動名詞"]
 ],
 "There are pros and cons to ...":[
  ["〜には良い面も悪い面もある","There are pros and cons to living abroad.","海外生活にはメリットとデメリットがあります。","to は前置詞なので動名詞を続ける"]
 ],
 "I'm used to ...ing":[
  ["〜することに慣れている","I'm used to driving in heavy traffic.","渋滞の中で運転することに慣れています。","to は前置詞。be used to doing"]
 ],
 "I'm getting used to ...ing":[
  ["〜することに慣れてきている","I'm getting used to speaking English at work.","仕事で英語を話すことに慣れてきています。","get used to の変化途中"]
 ],
 "Keep me posted.":[
  ["進捗があったら知らせてください","Please keep me posted on the shipment status.","船積み状況に進展があったら教えてください。","keep someone posted on + 内容"]
 ],
 "I'll keep you posted.":[
  ["進展があり次第知らせます","I'll keep you posted once I hear from the factory.","工場から連絡があり次第お知らせします。","状況が変わったときの共有"]
 ],
 "It turns out that ...":[
  ["実は〜だと分かった","It turns out that the supplier is closed tomorrow.","実は仕入先が明日休みだと分かりました。","turn out to be ... も使える"]
 ],
 "I ended up ...ing":[
  ["結局〜することになった","I ended up staying late at the office.","結局オフィスに遅くまで残ることになりました。","end up + 動名詞"]
 ]
};
const extra={
 "implement":{related:["implementation (n.)","implement a plan","implement a system"]},
 "acquire":{related:["acquisition (n.)","acquired (adj.)","acquire a skill"]},
 "negotiate":{related:["negotiation (n.)","negotiate payment terms"]},
 "coordinate":{related:["coordination (n.)","coordinate with someone"]},
 "feasible":{related:["feasibility (n.)","feasibility study"]},
 "margin":{related:["profit margin","margin for error"]},
 "outstanding":{related:["outstanding balance","outstanding performance"]},
 "settlement":{related:["reach a settlement","payment settlement"]},
 "quote":{related:["quotation (n.)","request a quote"]},
 "compliant":{related:["comply with","compliance (n.)"]},
 "revenue":{related:["revenue growth","revenue vs. profit"]},
 "facilitate":{related:["facilitation (n.)","facilitate market entry"]},
 "juggle":{related:["juggle work and study","juggle multiple tasks"]},
 "hesitant":{related:["hesitation (n.)","be hesitant to do"]},
 "be subject to ...":{related:["subject to change","subject to approval"]}
};
for(const w of window.LEXICON_DATA){
 if(w.set==="C")w.set="D";if(w.set==="S")w.set="B";
 w.pos=w.type==="C"?"expression":posMap[w.en]||"noun";
 const senses=senseData[w.en];
 w.senses=senses?senses.map(([ja,example,exampleJa,explain])=>({ja,example,exampleJa,explain})):[{ja:w.jp,example:w.example,exampleJa:w.exampleJa||"",explain:""}];
 w.related=extra[w.en]?.related||[];
 w.level=w.set==="T"?"B2–C1":(w.type==="C"?"B1–B2":"B2");
}
window.WORDMATE_PARTS=[
 {id:"noun",en:"Noun",ja:"名詞"},
 {id:"verb",en:"Verb",ja:"動詞"},
 {id:"adjective",en:"Adjective",ja:"形容詞"},
 {id:"adverb",en:"Adverb",ja:"副詞"},
 {id:"phrasal-verb",en:"Phrasal verb",ja:"句動詞"},
 {id:"expression",en:"Expression / chunk",ja:"定型表現・チャンク"}
];
})();