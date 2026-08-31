<<<<<<< HEAD
import { Footer, TopMenu } from '@/components';
=======
import { TopMenu, Sidebar } from '@/components';
>>>>>>> 833a45fadf50e643868084efb4a23165db1b06fb

export default function ShopLayout({children}: {
 children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
        <TopMenu />
        {/* <Sidebar/> */}
        <div className="px-0 sm:px-10">
          {children}
        </div>
<<<<<<< HEAD
        <Footer />
    </main>
  );
}
=======
        
    </main>
  );
}
>>>>>>> 833a45fadf50e643868084efb4a23165db1b06fb
