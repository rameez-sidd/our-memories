import { useEffect, useRef, useState } from "react";
import { configured, supabase } from "./supabase";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const cloudinaryConfigured = Boolean(cloudName && uploadPreset);
function Dialog({ children, dialogRef }) {
  return (
    <dialog ref={dialogRef} className="dialog">
      <button
        className="close"
        onClick={() => dialogRef.current.close()}
        aria-label="Close"
      >
        ×
      </button>
      {children}
    </dialog>
  );
}
export default function App() {
  const [user, setUser] = useState(null),
    [photos, setPhotos] = useState([]),
    [notice, setNotice] = useState(""),
    [authNotice, setAuthNotice] = useState(""),
    [uploadNotice, setUploadNotice] = useState(""),
    [selectedPhoto, setSelectedPhoto] = useState(null),
    [busy, setBusy] = useState(false);
  const authRef = useRef(),
    uploadRef = useRef(),
    fileRef = useRef();
  async function loadPhotos() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("photos")
      .select("id,storage_key,image_url,caption,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setNotice(
        "This account is not one of the two people invited to this library.",
      );
      return;
    }
    if (!data?.length) {
      setPhotos([]);
      return;
    }
    setPhotos(data.map((photo) => ({ ...photo, url: photo.image_url })));
  }
  useEffect(() => {
    if (!configured) {
      setNotice(
        "Add your Supabase keys in .env.local to connect your private library.",
      );
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadPhotos();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadPhotos();
      else setPhotos([]);
    });
    return () => subscription.unsubscribe();
  }, []);
  async function login(event) {
    event.preventDefault();
    if (!configured) {
      setAuthNotice(
        "Sign-in needs Supabase keys first. Add them to .env.local, then restart the app.",
      );
      return;
    }
    const email = new FormData(event.currentTarget).get("email");
    const password = new FormData(event.currentTarget).get("password");
    setAuthNotice("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) authRef.current.close();
    setAuthNotice(
      error ? error.message : "Welcome back — opening your memory wall.",
    );
  }
  function openAuth() {
    setAuthNotice(
      configured ? "" : "Connect Supabase in .env.local to turn on sign-in.",
    );
    authRef.current.showModal();
  }
  function choosePhotos(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadNotice("");
    if (selectedPhoto) URL.revokeObjectURL(selectedPhoto.preview);
    setSelectedPhoto({ file, preview: URL.createObjectURL(file) });
  }
  function openUpload() {
    if (selectedPhoto) URL.revokeObjectURL(selectedPhoto.preview);
    setSelectedPhoto(null);
    setUploadNotice("");
    if (fileRef.current) fileRef.current.value = "";
    uploadRef.current.showModal();
  }
  async function upload(event) {
    event.preventDefault();
    if (!selectedPhoto || !user) {
      setUploadNotice("Please sign in, then choose a photo.");
      return;
    }
    if (!cloudinaryConfigured) {
      setUploadNotice(
        "Add your Cloudinary cloud name and unsigned upload preset to .env.local first.",
      );
      return;
    }
    setBusy(true);
    setUploadNotice("Saving your memories…");
    try {
      const caption =
        new FormData(event.currentTarget).get("caption")?.trim() || "";
      {
        const upload = new FormData();
        upload.append("file", selectedPhoto.file);
        upload.append("upload_preset", uploadPreset);
        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: upload },
        );
        const cloudinaryData = await cloudinaryResponse.json();
        if (!cloudinaryResponse.ok)
          throw new Error(
            cloudinaryData.error?.message ||
              "The photo could not be sent to Cloudinary.",
          );
        const { data: savedPhoto, error } = await supabase
          .from("photos")
          .insert({
            storage_key: cloudinaryData.public_id,
            image_url: cloudinaryData.secure_url,
            caption,
            owner_id: user.id,
          })
          .select("id,storage_key,image_url,caption,created_at")
          .single();
        if (error) throw error;
        setPhotos((current) => [
          { ...savedPhoto, url: savedPhoto.image_url },
          ...current,
        ]);
      }
      uploadRef.current.close();
      event.currentTarget.reset();
      URL.revokeObjectURL(selectedPhoto.preview);
      setSelectedPhoto(null);
      setNotice("Saved to your little library.");
    } catch (error) {
      setUploadNotice(
        error.message || "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="ambient one" />
      <div className="ambient two" />
      <main>
        <header>
          <a className="brand" href="#top">
            <b>♥</b>
            <span>
              our little
              <br />
              <em>library</em>
            </span>
          </a>
          <nav>
            <a href="#memories">memories</a>
            <a href="#about">about us</a>
          </nav>
          <div className="actions">
            {user ? (
              <button className="link" onClick={() => supabase.auth.signOut()}>
                sign out
              </button>
            ) : (
              <button className="link" onClick={openAuth}>
                sign in
              </button>
            )}
            <button className="add" disabled={!user} onClick={openUpload}>
              <span>+</span> add a memory
            </button>
          </div>
        </header>
        <section className="hero" id="top">
          <p className="eyebrow">EST. WITH LOVE</p>
          <h1>
            every little moment,
            <br />
            <i>kept close.</i>
          </h1>
          <p>
            A soft little corner of the internet for all the photos, memories,
            and beautiful ordinary days we share.
          </p>
          <a href="#memories" className="scroll">
            <span />
            stroll through our days
          </a>
        </section>
        <section className="library" id="memories">
          <div className="heading">
            <div>
              <p className="eyebrow">OUR DAYS, IN TILES</p>
              <h2>The memory wall</h2>
            </div>
            <small>
              {user
                ? `${photos.length} ${photos.length === 1 ? "memory" : "memories"} saved`
                : "sign in to see your memories"}
            </small>
          </div>
          <div className="masonry">
            {photos.length ? (
              photos.map((photo) => (
                <figure key={photo.id}>
                  <img
                    src={photo.url}
                    alt={photo.caption || "A little memory"}
                  />
                  <figcaption>{photo.caption || "a little moment"}</figcaption>
                </figure>
              ))
            ) : (
              <div className="empty">
                <span>♡</span>
                <h3>
                  {user ? "Your wall is waiting" : "A private little corner"}
                </h3>
                <p>
                  {user
                    ? "The first photo is always the sweetest. Add one whenever you are ready."
                    : "Sign in with one of your two approved accounts to see your memories."}
                </p>
              </div>
            )}
          </div>
          {notice && <p className="notice">{notice}</p>}
        </section>
        <section className="love" id="about">
          <p>for all our</p>
          <h2>in-between moments</h2>
          <span>✦</span>
        </section>
      </main>
      <footer>
        made with a whole lot of love <b>♥</b>
      </footer>
      <Dialog dialogRef={authRef}>
        <p className="eyebrow">JUST THE TWO OF US</p>
        <h2>
          Welcome back,
          <br />
          <i>love.</i>
        </h2>
        <p className="copy">
          Sign in with the email and password created for one of the two
          approved accounts.
        </p>
        <form onSubmit={login}>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Your private password"
            />
          </label>
          <button className="submit">sign in</button>
        </form>
        {authNotice && <p className="auth-notice">{authNotice}</p>}
      </Dialog>
      <Dialog dialogRef={uploadRef}>
        <p className="eyebrow">A NEW LITTLE MOMENT</p>
        <h2>
          Add to our
          <br />
          <i>story.</i>
        </h2>
        <form onSubmit={upload}>
          <label className="drop">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              required
              onChange={choosePhotos}
            />
            {selectedPhoto ? (
              <>
                <img
                  className="upload-preview"
                  src={selectedPhoto.preview}
                  alt="Selected photo preview"
                />
                <span className="change-photo">
                  <span aria-hidden="true">↻</span> Change photo
                </span>
              </>
            ) : (
              <>
                <span>+</span>
                <b>choose a photo</b>
                <small>JPG, PNG, HEIC or WEBP</small>
              </>
            )}
          </label>
          <label>
            A little note <em>(optional)</em>
            <input
              name="caption"
              maxLength="140"
              placeholder="Sunday coffee, just us…"
            />
          </label>
          <button className="submit" disabled={busy}>
            {busy ? "saving…" : "add to our wall"}
          </button>
          {uploadNotice && <p className="auth-notice">{uploadNotice}</p>}
        </form>
      </Dialog>
    </>
  );
}
