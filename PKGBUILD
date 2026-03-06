# Maintainer: lauer-safenow <lauer@safenow.de>
pkgname=screen-paint0r
pkgver=1.0.0
pkgrel=1
pkgdesc='Draw on your screen with global shortcuts'
arch=('x86_64')
url='https://github.com/lauer-safenow/screen-paint0r'
license=('MIT')
depends=('electron' 'gtk3' 'nss' 'libxss')
makedepends=('npm' 'nodejs')
source=("git+${url}.git")
sha256sums=('SKIP')

build() {
  cd "$srcdir/$pkgname"
  npm install
  npm run build
  node generate-icons.mjs
  npx electron-packager . "$pkgname" \
    --platform=linux --arch=x64 \
    --out=release --overwrite \
    --icon=assets/icon.png \
    --ignore="(src|generate-icons|generate-icns|tsconfig|forge\.config|vite\.|assets|release|PKGBUILD|\.desktop$)"
}

package() {
  cd "$srcdir/$pkgname"

  # Install app files
  install -d "$pkgdir/opt/$pkgname"
  cp -r "release/$pkgname-linux-x64/"* "$pkgdir/opt/$pkgname/"

  # Desktop entry
  install -Dm644 screen-paint0r.desktop "$pkgdir/usr/share/applications/$pkgname.desktop"

  # Icon
  install -Dm644 assets/icon.png "$pkgdir/usr/share/icons/hicolor/256x256/apps/$pkgname.png"

  # Symlink binary
  install -d "$pkgdir/usr/bin"
  ln -s /opt/$pkgname/$pkgname "$pkgdir/usr/bin/$pkgname"

  # License
  install -Dm644 LICENSE "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
}
