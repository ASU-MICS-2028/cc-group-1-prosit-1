using System.Text;
using AgroConnect.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgroConnect.Data.Persistence;

/// <summary>The PostgreSQL database. Every schema change is a migration committed to Git (Data/Migrations).</summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();

    public DbSet<LoginCode> LoginCodes => Set<LoginCode>();

    public DbSet<Farmer> Farmers => Set<Farmer>();

    public DbSet<Visit> Visits => Set<Visit>();

    public DbSet<Photo> Photos => Set<Photo>();

    public DbSet<Wallet> Wallets => Set<Wallet>();

    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<HelpRequest> HelpRequests => Set<HelpRequest>();

    public DbSet<UssdSession> UssdSessions => Set<UssdSession>();

    public DbSet<HelpVoiceNote> HelpVoiceNotes => Set<HelpVoiceNote>();

    public DbSet<AlertSetting> AlertSettings => Set<AlertSetting>();

    public DbSet<SpeechClip> SpeechClips => Set<SpeechClip>();

    public DbSet<Cooperative> Cooperatives => Set<Cooperative>();
    public DbSet<CooperativeMember> CooperativeMembers => Set<CooperativeMember>();
    public DbSet<SavingsContribution> SavingsContributions => Set<SavingsContribution>();
    public DbSet<GroupOrder> GroupOrders => Set<GroupOrder>();
    public DbSet<GroupOrderLine> GroupOrderLines => Set<GroupOrderLine>();
    public DbSet<GroupSale> GroupSales => Set<GroupSale>();
    public DbSet<SalePledge> SalePledges => Set<SalePledge>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<MeetingRsvp> MeetingRsvps => Set<MeetingRsvp>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>(user =>
        {
            user.ToTable("users");
            user.Property(u => u.PhoneE164).HasMaxLength(16);
            user.Property(u => u.FullName).HasMaxLength(100);
            user.Property(u => u.Region).HasMaxLength(100);
            user.Property(u => u.District).HasMaxLength(100);
            user.HasIndex(u => new { u.PhoneE164, u.Role }).IsUnique();
            // A farmer account belongs to one farmer record.
            user.HasOne<Farmer>().WithMany().HasForeignKey(u => u.FarmerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LoginCode>(code =>
        {
            code.ToTable("login_codes");
            code.Property(c => c.PhoneE164).HasMaxLength(16);
            code.Property(c => c.CodeHash).HasMaxLength(64);
            code.HasIndex(c => new { c.PhoneE164, c.Role, c.CreatedAt });
        });

        modelBuilder.Entity<Farmer>(farmer =>
        {
            farmer.ToTable("farmers");
            farmer.Property(f => f.Id).ValueGeneratedNever();
            farmer.Property(f => f.FullName).HasMaxLength(100);
            farmer.Property(f => f.PhoneE164).HasMaxLength(16);
            farmer.Property(f => f.Community).HasMaxLength(100);
            farmer.Property(f => f.RegionDistrict).HasMaxLength(100);
            farmer.Property(f => f.FarmSize).HasPrecision(9, 2);
            // Not unique: family members can share a phone. The app warns about possible duplicates instead.
            farmer.HasIndex(f => f.PhoneE164);
            farmer.HasIndex(f => new { f.RegisteredById, f.ServerUpdatedAt });
            farmer.HasOne<AppUser>().WithMany().HasForeignKey(f => f.RegisteredById).OnDelete(DeleteBehavior.Restrict);
            // PhotoId has no foreign key on purpose: offline, the farmer record syncs before its photo is uploaded.
        });

        modelBuilder.Entity<Visit>(visit =>
        {
            visit.ToTable("visits");
            visit.Property(v => v.Id).ValueGeneratedNever();
            visit.Property(v => v.Notes).HasMaxLength(2000);
            visit.HasIndex(v => new { v.OfficerId, v.ServerUpdatedAt });
            visit.HasOne<Farmer>().WithMany().HasForeignKey(v => v.FarmerId).OnDelete(DeleteBehavior.Restrict);
            visit.HasOne<AppUser>().WithMany().HasForeignKey(v => v.OfficerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Photo>(photo =>
        {
            photo.ToTable("photos");
            photo.Property(p => p.Id).ValueGeneratedNever();
            photo.Property(p => p.ContentType).HasMaxLength(50);
            photo.HasOne<Farmer>().WithMany().HasForeignKey(p => p.FarmerId).OnDelete(DeleteBehavior.Restrict);
            photo.HasOne<AppUser>().WithMany().HasForeignKey(p => p.UploadedById).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Wallet>(wallet =>
        {
            wallet.ToTable("wallets");
            wallet.Property(w => w.Id).ValueGeneratedNever();
            wallet.Property(w => w.PhoneE164).HasMaxLength(16);
            wallet.Property(w => w.RecipientCode).HasMaxLength(50);
            wallet.HasIndex(w => w.FarmerId).IsUnique();
            wallet.HasOne<Farmer>().WithMany().HasForeignKey(w => w.FarmerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Payment>(payment =>
        {
            payment.ToTable("payments");
            payment.Property(p => p.Id).ValueGeneratedNever();
            payment.Property(p => p.Description).HasMaxLength(100);
            payment.Property(p => p.PhoneE164).HasMaxLength(16);
            payment.Property(p => p.Reference).HasMaxLength(50);
            payment.Property(p => p.ProviderMessage).HasMaxLength(300);
            payment.HasIndex(p => p.Reference).IsUnique();
            payment.HasIndex(p => new { p.FarmerId, p.CreatedAt });
            payment.HasOne<Farmer>().WithMany().HasForeignKey(p => p.FarmerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<HelpRequest>(help =>
        {
            help.ToTable("help_requests");
            help.Property(h => h.Id).ValueGeneratedNever();
            help.Property(h => h.Text).HasMaxLength(1000);
            help.Property(h => h.Problem).HasMaxLength(50);
            help.Property(h => h.Answer).HasMaxLength(2000);
            help.HasIndex(h => new { h.FarmerId, h.CreatedAt });
            help.HasIndex(h => new { h.OfficerId, h.Status });
            help.HasOne<Farmer>().WithMany().HasForeignKey(h => h.FarmerId).OnDelete(DeleteBehavior.Restrict);
            help.HasOne<AppUser>().WithMany().HasForeignKey(h => h.OfficerId).OnDelete(DeleteBehavior.Restrict);
            help.HasOne<AppUser>().WithMany().HasForeignKey(h => h.AnsweredById).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<HelpVoiceNote>(note =>
        {
            note.ToTable("help_voice_notes");
            note.HasKey(n => n.HelpRequestId);
            note.Property(n => n.ContentType).HasMaxLength(50);
            note.HasOne<HelpRequest>().WithOne().HasForeignKey<HelpVoiceNote>(n => n.HelpRequestId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AlertSetting>(alert =>
        {
            alert.ToTable("alert_settings");
            alert.HasKey(a => a.FarmerId);
            alert.HasOne<Farmer>().WithOne().HasForeignKey<AlertSetting>(a => a.FarmerId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SpeechClip>(clip =>
        {
            clip.ToTable("speech_clips");
            clip.Property(c => c.Id).ValueGeneratedNever();
            clip.Property(c => c.Language).HasMaxLength(8);
            clip.Property(c => c.TextHash).HasMaxLength(64);
            clip.Property(c => c.Text).HasMaxLength(500);
            clip.Property(c => c.Translated).HasMaxLength(1500);
            clip.Property(c => c.ContentType).HasMaxLength(50);
            clip.HasIndex(c => new { c.Language, c.TextHash }).IsUnique();
        });

        modelBuilder.Entity<Cooperative>(cooperative =>
        {
            cooperative.ToTable("cooperatives");
            cooperative.Property(c => c.Id).ValueGeneratedNever();
            cooperative.Property(c => c.Name).HasMaxLength(150);
            cooperative.Property(c => c.Community).HasMaxLength(100);
            cooperative.Property(c => c.Region).HasMaxLength(100);
            cooperative.Property(c => c.District).HasMaxLength(100);
            cooperative.HasOne<Farmer>().WithMany().HasForeignKey(c => c.LeaderFarmerId).OnDelete(DeleteBehavior.Restrict);
            cooperative.HasOne<AppUser>().WithMany().HasForeignKey(c => c.CreatedById).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<CooperativeMember>(member =>
        {
            member.ToTable("cooperative_members");
            member.HasKey(m => new { m.CooperativeId, m.FarmerId });
            member.HasIndex(m => m.FarmerId).IsUnique();
            member.HasOne<Cooperative>().WithMany().HasForeignKey(m => m.CooperativeId).OnDelete(DeleteBehavior.Cascade);
            member.HasOne<Farmer>().WithMany().HasForeignKey(m => m.FarmerId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<SavingsContribution>(contribution =>
        {
            contribution.ToTable("savings_contributions");
            contribution.Property(c => c.Id).ValueGeneratedNever();
            contribution.HasOne<Cooperative>().WithMany().HasForeignKey(c => c.CooperativeId).OnDelete(DeleteBehavior.Restrict);
            contribution.HasOne<Farmer>().WithMany().HasForeignKey(c => c.FarmerId).OnDelete(DeleteBehavior.Restrict);
            contribution.HasOne<Payment>().WithMany().HasForeignKey(c => c.PaymentId).OnDelete(DeleteBehavior.Restrict);
            contribution.HasIndex(c => new { c.CooperativeId, c.FarmerId });
        });
        modelBuilder.Entity<GroupOrder>(order =>
        {
            order.ToTable("group_orders"); order.Property(o => o.Id).ValueGeneratedNever();
            order.Property(o => o.Product).HasMaxLength(100); order.Property(o => o.Dealer).HasMaxLength(100);
            order.HasOne<Cooperative>().WithMany().HasForeignKey(o => o.CooperativeId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<GroupOrderLine>(line =>
        {
            line.ToTable("group_order_lines"); line.HasKey(l => new { l.OrderId, l.FarmerId });
            line.HasOne<GroupOrder>().WithMany().HasForeignKey(l => l.OrderId).OnDelete(DeleteBehavior.Cascade);
            line.HasOne<Farmer>().WithMany().HasForeignKey(l => l.FarmerId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<GroupSale>(sale =>
        {
            sale.ToTable("group_sales"); sale.Property(s => s.Id).ValueGeneratedNever();
            sale.Property(s => s.Crop).HasMaxLength(50); sale.Property(s => s.Buyer).HasMaxLength(100);
            sale.HasOne<Cooperative>().WithMany().HasForeignKey(s => s.CooperativeId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<SalePledge>(pledge =>
        {
            pledge.ToTable("sale_pledges"); pledge.HasKey(p => new { p.SaleId, p.FarmerId });
            pledge.HasOne<GroupSale>().WithMany().HasForeignKey(p => p.SaleId).OnDelete(DeleteBehavior.Cascade);
            pledge.HasOne<Farmer>().WithMany().HasForeignKey(p => p.FarmerId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<Meeting>(meeting =>
        {
            meeting.ToTable("meetings"); meeting.Property(m => m.Id).ValueGeneratedNever();
            meeting.Property(m => m.Place).HasMaxLength(150); meeting.Property(m => m.Topic).HasMaxLength(200); meeting.Property(m => m.Bring).HasMaxLength(300);
            meeting.HasOne<Cooperative>().WithMany().HasForeignKey(m => m.CooperativeId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<MeetingRsvp>(rsvp =>
        {
            rsvp.ToTable("meeting_rsvps"); rsvp.HasKey(r => new { r.MeetingId, r.FarmerId });
            rsvp.HasOne<Meeting>().WithMany().HasForeignKey(r => r.MeetingId).OnDelete(DeleteBehavior.Cascade);
            rsvp.HasOne<Farmer>().WithMany().HasForeignKey(r => r.FarmerId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UssdSession>(session =>
        {
            session.ToTable("ussd_sessions");
            session.HasKey(u => u.SessionId);
            session.Property(u => u.SessionId).HasMaxLength(64);
            session.Property(u => u.PhoneE164).HasMaxLength(16);
            session.Property(u => u.Screen).HasMaxLength(30);
            session.Property(u => u.Data).HasMaxLength(200);
            // Finished sessions are cleared by age.
            session.HasIndex(u => u.UpdatedAt);
        });

        UseSnakeCaseNames(modelBuilder);
    }

    /// <summary>
    /// PostgreSQL convention: lower-case snake_case names (full_name, ix_farmers_phone_e164), so SQL needs no quotes.
    /// C# keeps its PascalCase property names; only the database names change.
    /// </summary>
    private static void UseSnakeCaseNames(ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }

            foreach (var key in entity.GetKeys())
            {
                key.SetName(ToSnakeCase(key.GetName()!));
            }

            foreach (var foreignKey in entity.GetForeignKeys())
            {
                foreignKey.SetConstraintName(ToSnakeCase(foreignKey.GetConstraintName()!));
            }

            foreach (var index in entity.GetIndexes())
            {
                index.SetDatabaseName(ToSnakeCase(index.GetDatabaseName()!));
            }
        }
    }

    /// <summary>"PhoneE164" to "phone_e164", "IX_users_PhoneE164_Role" to "ix_users_phone_e164_role".</summary>
    internal static string ToSnakeCase(string name)
    {
        var builder = new StringBuilder(name.Length + 8);
        for (var i = 0; i < name.Length; i++)
        {
            var current = name[i];
            if (char.IsUpper(current))
            {
                var previous = i > 0 ? name[i - 1] : '_';
                var next = i + 1 < name.Length ? name[i + 1] : '_';
                // New word: after a lower-case letter or digit, or at the end of an acronym ("IXUsers" -> "ix_users").
                if (i > 0 && previous != '_' && (char.IsLower(previous) || char.IsDigit(previous) || (char.IsUpper(previous) && char.IsLower(next))))
                {
                    builder.Append('_');
                }

                builder.Append(char.ToLowerInvariant(current));
            }
            else
            {
                builder.Append(current);
            }
        }

        return builder.ToString();
    }
}
