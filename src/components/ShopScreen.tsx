interface ShopScreenProps {
  userLevel: number;
}

export function ShopScreen({ userLevel: _userLevel }: ShopScreenProps) {
  return (
    <section className="screen shop-screen">
      <header className="shop-header">
        <h1>ショップ</h1>
        <p className="shop-subtitle muted">
          追加色とお絵描きツールの早期解放は、お絵描き画面から購入できます。
        </p>
      </header>

      <div className="shop-section">
        <h2 className="shop-section-title">追加色パレット</h2>
        <p className="shop-section-note muted">
          上段の色がレベル解放されると、同じ列の下段を 💎20
          で購入できます。Lv50 以降は右2列4色も 💎20 で購入可能です。
        </p>
        <p className="shop-section-note muted">
          パレットの鍵マークをタップして、編集画面から解放してください。
        </p>
      </div>

      <div className="shop-section">
        <h2 className="shop-section-title">お絵描きツール早期解放</h2>
        <p className="shop-section-note muted">
          元に戻す・やり直し・図形・コピー・太さ・ズームなどは、レベルアップでも無料解放されます。それ以前に使いたい場合はツールバーの鍵から
          💎20 で永久解放できます。
        </p>
      </div>
    </section>
  );
}
