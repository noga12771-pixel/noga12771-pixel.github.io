"""
שרת מקומי לצפייה באתר.

הרצה (מתיקיית הפרויקט):
    python scripts/serve.py

הדפדפן נפתח לבד בכתובת http://localhost:8000 (עם --no-browser הוא לא נפתח, ועם --port אפשר לבחור פורט אחר)
השרת שולח את הקבצים בלי שמירה בזיכרון המטמון (cache), כך שכל רענון מציג את הגרסה העדכנית.
לעצירה: Ctrl+C בחלון שבו השרת רץ.
"""

import errno
import functools
import http.server
import socket
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORT = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8000
URL = f"http://localhost:{PORT}/"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 שומר את החיבור פתוח בין קבצים. עם ברירת המחדל (HTTP/1.0) החיבור נסגר
    # אחרי כל קובץ, וב-Windows זה גורם מדי פעם לניתוק באמצע העברה (ERR_CONNECTION_RESET)
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    # מאזין גם ל-IPv4 וגם ל-IPv6 (כמו python -m http.server), כך שאם כבר רץ שרת
    # על פורט 8000 נקבל הודעה ברורה, במקום שני שרתים שעונים על אותה כתובת
    address_family = socket.AF_INET6
    allow_reuse_address = False
    # ברירת המחדל היא תור של 5 חיבורים בלבד. הדפדפן מבקש כ-12 קבצים בבת אחת,
    # ו-Windows מנתק את מה שלא נכנס לתור (ERR_CONNECTION_RESET ותמונות שבורות)
    request_queue_size = 128

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


def main():
    open_browser = "--no-browser" not in sys.argv
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    try:
        server = Server(("::", PORT), handler)
    except OSError as e:
        if e.errno in (errno.EADDRINUSE, 10048):
            print(f"כבר פועל שרת על פורט {PORT}. אם הוא לא מהסקריפט הזה, סגרי אותו (Ctrl+C בחלון שלו)")
            print(f"והריצי שוב. אחרת, פשוט פתחי בדפדפן: {URL}")
            if open_browser:
                webbrowser.open(URL)
            return
        raise
    print(f"האתר זמין בכתובת {URL}")
    print("לעצירה: Ctrl+C")
    if open_browser:
        webbrowser.open(URL)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nהשרת נעצר.")


if __name__ == "__main__":
    main()
