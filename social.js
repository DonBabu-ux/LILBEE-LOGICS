document.getElementById("postBtn")?.addEventListener("click", () => {
  const content = postContent.value;
  if (!content) return;

  const post = document.createElement("div");
  post.className = "glass-card";
  post.textContent = content;

  posts.prepend(post);
  postContent.value = "";
});
