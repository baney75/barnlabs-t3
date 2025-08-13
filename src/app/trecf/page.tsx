import NavBar from "~/components/NavBar";
import ModelViewer from "~/components/viewer/ModelViewer";
import { type Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Tom Ridge Environmental Center | BarnLabs",
  description:
    "Experience the S.S. Dean Richmond in AR/VR at the Tom Ridge Environmental Center, Presque Isle State Park, Erie PA.",
};

export default function TrecfPage() {
  return (
    <main className="min-h-screen bg-[color:var(--color-hero-bg)] text-[color:var(--color-hero-text)]">
      <NavBar />
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/1/1e/Tom_Ridge_Environmental_Center.jpg')] bg-cover bg-center opacity-20" />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-900/90 via-indigo-800/90 to-purple-800/90 p-6 text-white shadow-lg">
            <h1 className="[font-family:var(--font-display)] text-4xl">Tom Ridge Environmental Center</h1>
            <p className="mt-2 opacity-90">Presque Isle State Park, Erie, Pennsylvania</p>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div className="rounded-md bg-white/10 p-3">
                <div className="font-semibold">Address</div>
                <div>301 Peninsula Drive, Erie, PA 16505</div>
                <div>814-833-7424</div>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <div className="font-semibold">Admission</div>
                <div>Free general admission</div>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <div className="font-semibold">Hours</div>
                <div>Apr–Oct: Visitor Center 8:00am–4:00pm daily</div>
                <div>Nov–Mar: Tue–Sat 8:00am–4:00pm</div>
              </div>
            </div>
            <a
              href="https://www.pa.gov/agencies/dcnr/recreation/where-to-go/state-parks/find-a-park/presque-isle-state-park/trec"
              target="_blank"
              className="mt-4 inline-block underline"
            >
              Official TREC page
            </a>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-3 [font-family:var(--font-display)] text-2xl">Featured 3D Model: SS Dean Richmond</h2>
            <ModelViewer
              src="https://t3rgh6yjwx.ufs.sh/f/DGcq4LQh6E89Co1yGNeldY0T6O4ZvbiLtsrpqA9PuzUwVMmx"
              usdz="https://t3rgh6yjwx.ufs.sh/f/DGcq4LQh6E89hu2KiSpvRJ2ubg0iEeqLh6flO9Pm5STDWYaB"
              background="studio"
            />
            <p className="mt-2 text-sm opacity-80">
              SS Dean Richmond was a 238–239 ft wooden propeller steamer (built 1864) that foundered in an 1893 Lake Erie storm; 20 lives were lost. See details at the Regional Science Consortium: <a className="underline" target="_blank" href="https://www.regsciconsort.com/lake-erie-shipwrecks/dean-richmond/">Dean Richmond</a>.
              Model courtesy of <a href="https://3dshipwrecks.org" target="_blank" className="underline">3DShipwrecks</a>.
            </p>
            <div className="mt-4 rounded-md bg-[color:var(--color-goals-bg)] p-4 text-[color:var(--color-header-text)]">
              <div className="font-semibold">AR/VR Tips</div>
              <ul className="list-disc pl-6 text-sm opacity-90">
                <li>iOS: Tap &quot;View in AR&quot; to launch USDZ in Quick Look.</li>
                <li>Android: Tap &quot;View in AR&quot; to launch Scene Viewer.</li>
                <li>VR: Tap &quot;View in VR&quot; then the headset icon. Use a mobile headset case for best experience.</li>
              </ul>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="[font-family:var(--font-display)] text-2xl">About TREC</h2>
            <p className="opacity-90">
              The Tom Ridge Environmental Center (TREC) is dedicated to the 3,200 acres of Presque Isle, combining research,
              education, and visitor services in one destination. Explore exhibits, climb the 75&apos; glass tower, and learn how to keep Presque Isle pristine.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <img
                alt="TREC exterior (outside)"
                src="https://t3rgh6yjwx.ufs.sh/f/DGcq4LQh6E89gFPm3ho28ADqJz1tYU6id43wp5sjPVH7x9kS"
                className="h-40 w-full rounded-md object-cover"
              />
              <img
                alt="TREC interior (inside)"
                src="https://t3rgh6yjwx.ufs.sh/f/DGcq4LQh6E89hz58uQpvRJ2ubg0iEeqLh6flO9Pm5STDWYaB"
                className="h-40 w-full rounded-md object-cover"
              />
            </div>
            <div className="rounded-md bg-[color:var(--color-goals-bg)] p-4 text-[color:var(--color-header-text)]">
              <div className="font-semibold">Plan Your Visit</div>
              <ul className="list-disc pl-6 text-sm opacity-90">
                <li>Free general admission to exhibits and orientation movie.</li>
                <li>Visitor Center 8:00am–4:00pm (see seasonal hours).</li>
                <li>Shop Presque Isle Gallery & Gifts to support TREC.</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-12 text-sm opacity-80">
          Created by the team at BARN Labs
        </div>
      </section>
    </main>
  );
}
