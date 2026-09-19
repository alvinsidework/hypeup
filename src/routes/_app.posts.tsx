import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/posts")({
  component: PostsLayout,
});

function PostsLayout() {
  return <Outlet />;
}
