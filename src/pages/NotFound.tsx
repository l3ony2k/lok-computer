import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const messages = [
    {
      lang: "English",
      text: "The page you are looking for does not exist. Please check the URL or return to the homepage to continue browsing."
    },
    {
      lang: "French",
      text: "La page que vous recherchez n'existe pas. Veuillez vérifier l'URL ou retourner à la page d'accueil pour continuer votre navigation."
    },
    {
      lang: "German",
      text: "Die gesuchte Seite existiert nicht. Bitte überprüfen Sie die URL oder kehren Sie zur Startseite zurück, um fortzufahren."
    },
    {
      lang: "Spanish",
      text: "La página que buscas no existe. Por favor, verifica la URL o vuelve a la página de inicio para seguir navegando."
    },
    {
      lang: "zh-HK",
      text: "搵唔到閣下想要嘅頁面。麻煩檢查下個網址，或者返去首頁。"
    },
    {
      lang: "zh-TW",
      text: "找不到您要瀏覽的頁面。請檢查網址，或返回首頁。"
    },
    {
      lang: "Japanese",
      text: "お探しのページは見つかりませんでした。URLをご確認いただくか、トップページへお戻りください。"
    },
    {
      lang: "Korean",
      text: "요청하신 페이지를 찾을 수 없습니다. 입력하신 주소를 확인하시거나, 홈페이지로 돌아가 주시기 바랍니다."
    },
    {
      lang: "Russian",
      text: "Запрашиваемая страница не найдена. Пожалуйста, проверьте адрес или вернитесь на главную страницу."
    },
    {
      lang: "Arabic",
      text: "الصفحة التي تبحث عنها غير موجودة. يرجى التحقق من الرابط أو العودة إلى الصفحة الرئيسية.",
      rtl: true
    }
  ];


  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm overflow-y-auto select-none">
      <div className="min-h-full w-full flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl my-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">404 Page Not Found</h1>
          </div>

          {/* Multi-language messages */}
          <div className="space-y-4 text-foreground/90">
            {messages.map((msg, index) => (
              <p
                key={index}
                className="text-base leading-relaxed"
                dir={msg.rtl ? "rtl" : undefined}
              >
                {msg.text}
              </p>
            ))}
          </div>

          {/* Error details */}
          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">
              Path: <span className="font-bold">{location.pathname}</span>
            </p>
            <p className="text-sm text-foreground/70 italic mb-6">
              "You can't use an old map to explore a new world."
            </p>

            <a href="/">
              <button className="retro-button px-4 py-2">
                Return to Home
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
