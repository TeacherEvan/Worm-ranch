export async function preloadGameplayBackdrop(backdropUrl: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const image = new window.Image();
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    image.decoding = "async";
    image.onload = finish;
    image.onerror = finish;
    image.src = backdropUrl;

    if (image.complete) {
      finish();
      return;
    }

    image.decode?.().then(finish, finish);
  });
}
