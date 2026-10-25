import SwiftUI
import TwistedTacKit

struct LeaderboardView: View {
    @Environment(AuthManager.self) private var auth

    @State private var result: LeaderboardResult?
    @State private var errorMessage: String?
    @State private var loading = true

    var body: some View {
        ZStack {
            Theme.background
            content
        }
        .navigationTitle("Leaderboard")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    @ViewBuilder
    private var content: some View {
        if loading && result == nil {
            ProgressView().controlSize(.large)
        } else if let errorMessage {
            ContentUnavailableView {
                Label("Can't load the leaderboard", systemImage: "wifi.exclamationmark")
            } description: {
                Text(errorMessage)
            } actions: {
                Button("Try again") { Task { await load() } }.buttonStyle(.glass)
            }
        } else if let result, result.entries.isEmpty {
            ContentUnavailableView(
                "No ranked games yet",
                systemImage: "trophy",
                description: Text("Win an online match to be first on the board.")
            )
        } else if let result {
            ScrollView {
                VStack(spacing: 12) {
                    if let rank = result.userRank, let name = auth.profile?.username {
                        yourRank(rank: rank, name: name)
                    }
                    GlassEffectContainer(spacing: 10) {
                        VStack(spacing: 10) {
                            ForEach(Array(result.entries.enumerated()), id: \.element.id) { index, entry in
                                row(rank: index + 1, entry: entry)
                            }
                        }
                    }
                }
                .padding(16)
            }
        }
    }

    private func yourRank(rank: Int, name: String) -> some View {
        HStack {
            Text("Your rank").foregroundStyle(Theme.muted)
            Spacer()
            Text("#\(rank)").font(.system(.title3, design: .rounded, weight: .black)).foregroundStyle(Theme.playerO)
            Text(name).font(.subheadline.weight(.semibold))
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .glassEffect(.regular.tint(Theme.playerO.opacity(0.25)), in: .rect(cornerRadius: 16))
    }

    private func row(rank: Int, entry: LeaderboardEntry) -> some View {
        let isMe = entry.id.lowercased() == auth.userID
        return HStack(spacing: 12) {
            Text("\(rank)")
                .font(.system(.title3, design: .rounded, weight: .black))
                .foregroundStyle(medalColor(rank))
                .frame(width: 30)
            AvatarView(urlString: entry.avatarURL, name: entry.username ?? "?", size: 38)
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.username ?? "—").font(.headline).lineLimit(1)
                Text("\(entry.wins)W · \(entry.losses)L · \(entry.draws)D")
                    .font(.caption).foregroundStyle(Theme.muted)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 0) {
                Text("\(entry.points)").font(.system(.title3, design: .rounded, weight: .black))
                Text("pts").font(.caption2).foregroundStyle(Theme.muted)
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .glassEffect(.regular.tint(isMe ? Theme.playerO.opacity(0.25) : medalColor(rank).opacity(rank <= 3 ? 0.14 : 0)),
                     in: .rect(cornerRadius: 18))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Rank \(rank), \(entry.username ?? "player"), \(entry.points) points")
    }

    private func medalColor(_ rank: Int) -> Color {
        switch rank {
        case 1: Color(red: 1, green: 0.82, blue: 0.3)
        case 2: Color(red: 0.78, green: 0.8, blue: 0.85)
        case 3: Color(red: 0.85, green: 0.55, blue: 0.3)
        default: Theme.foreground
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            result = try await LeaderboardService.load(for: auth.userID)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct AvatarView: View {
    let urlString: String?
    let name: String
    var size: CGFloat = 44

    var body: some View {
        Group {
            if let urlString, isSafeAvatarURL(urlString), let url = URL(string: urlString), !urlString.isEmpty {
                AsyncImage(url: url) { phase in
                    if let image = phase.image { image.resizable().scaledToFill() } else { initials }
                }
            } else {
                initials
            }
        }
        .frame(width: size, height: size)
        .clipShape(.circle)
        .accessibilityHidden(true)
    }

    private var initials: some View {
        ZStack {
            Circle().fill(Theme.playerO.opacity(0.25))
            Text(String(name.prefix(1)).uppercased())
                .font(.system(size: size * 0.42, weight: .bold, design: .rounded))
        }
    }
}
