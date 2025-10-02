import { cn } from "@/lib/utils";

export function BackgroundPattern({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "absolute inset-0 opacity-[1.5%] w-screen min-h-full bg-repeat",
        className
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTc3IiBoZWlnaHQ9IjEyNDYiIHZpZXdCb3g9IjAgMCA5NzcgMTI0NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHBhdGggZmlsbD0idXJsKCNhKSIgZD0iTTAgMGg5Nzd2MTI0NkgweiIvPjxkZWZzPjxwYXR0ZXJuIGlkPSJhIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIiBwYXR0ZXJuVHJhbnNmb3JtPSJtYXRyaXgoNDg3LjIxOCAwIDAgNDE5LjkxMSAzNjYuMTQzIDQzMy43KSIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSIgdmlld0JveD0iLTAuNTUzIDIwLjY1NSA0ODcuMjE4IDQxOS45MTEiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjx1c2UgeGxpbms6aHJlZj0iI2IiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgLTQxOS45MTEpIi8+PHVzZSB4bGluazpocmVmPSIjYiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjQzLjYwOSAtMjA5Ljk1NSkiLz48cGF0aCBkPSJNMjIxLjE3MyAxOTguNzM4QzIwOC43ODIgODguOTc1IDEwOS43NjMgMTAuMDQ1IDAgMjIuNDM2bDExLjIxOCA5OS4zNjljNTQuODgxLTYuMTk2IDEwNC4zOTEgMzMuMjY5IDExMC41ODcgODguMTVzLTMzLjI3IDEwNC4zOTItODguMTUxIDExMC41ODdsMTEuMjE3IDk5LjM2OUMxNTQuNjM0IDQwNy41MiAyMzMuNTY1IDMwOC41IDIyMS4xNzMgMTk4LjczOFoiIGZpbGw9IiNEOUQ5RDkiIHN0cm9rZT0iI2ZmZiIgaWQ9ImIiLz48dXNlIHhsaW5rOmhyZWY9IiNiIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyNDMuNjA5IDIwOS45NTUpIi8+PC9wYXR0ZXJuPjwvZGVmcz48L3N2Zz4=")`,
        backgroundSize: "285px 363.47px",
        ...style,
      }}
      {...props}
    ></div>
  );
}
