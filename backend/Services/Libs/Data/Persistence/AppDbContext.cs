using Microsoft.EntityFrameworkCore;

namespace AgroConnect.Data.Persistence;

/// <summary>
/// The PostgreSQL database. Entity sets and their configurations are added with the
/// farmer model; every schema change is a migration committed to Git.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
}
