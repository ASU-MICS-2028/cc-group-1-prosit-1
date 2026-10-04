# Stage 1: build and publish the API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props ./
COPY APIs/ APIs/
COPY Services/ Services/
# Cache mount keeps downloaded packages between builds (a retry after a network drop resumes).
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore APIs/agroconnect-api
# The OpenAPI document is generated at build time; skip it here, it is committed in openapi/.
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish APIs/agroconnect-api -c Release -o /out --no-restore -p:OpenApiGenerateDocuments=false

# Stage 2: run it. Debian-based image on purpose: it has bash, which the compose health check uses.
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .
# Non-root user (the base image provides one; APP_UID is its id).
USER $APP_UID
ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_gcServer=0 \
    DOTNET_EnableDiagnostics=0
EXPOSE 8080
ENTRYPOINT ["dotnet", "AgroConnect.Api.dll"]
