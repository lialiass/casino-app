import UIKit
import Capacitor

/// Subclass de CAPBridgeViewController pour forcer le fond sombre casino.
/// Sans ce fichier, WKWebView utilise un background blanc — visible lors du
/// rubber-band overscroll iOS (pull vers le bas / vers le haut).
class ViewController: CAPBridgeViewController {

    /// Couleur de fond de l'app — correspond à var(--bg) dans index.css
    private let appBg = UIColor(red: 8/255, green: 12/255, blue: 20/255, alpha: 1.0)

    override func viewDidLoad() {
        super.viewDidLoad()

        // Fond du ViewController root (derrière la WebView)
        view.backgroundColor = appBg

        // Fond de la WKWebView elle-même
        webView?.backgroundColor = appBg
        webView?.isOpaque = true

        // Fond du scroll view — c'est lui qui est visible lors de l'overscroll iOS
        webView?.scrollView.backgroundColor = appBg

        // Indicateurs de scroll invisibles (dark-on-dark = inutiles)
        webView?.scrollView.indicatorStyle = .white
    }
}
