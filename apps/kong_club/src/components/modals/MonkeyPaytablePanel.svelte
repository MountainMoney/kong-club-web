<script lang="ts">
	import {
		clusterPayAtSize,
		SMALL_CLUSTER_TIERS,
		type SmallClusterPayTierValues,
	} from '../../game/clusterPaytable';
	import { isSocialMode, paytableCopy, paytableModeLabel } from '../../game/socialCopy';
	import { shouldDisplayRtp } from '../../game/jurisdiction';
	import { assetUrl } from '../../game/assetUrl';
	import {
		PUBLISHED_MAX_WIN_LABEL,
		PUBLISHED_MODE_COST,
		PUBLISHED_RTP_PCT,
		formatPublishedCost,
		type PublishedModeKey,
	} from '../../game/publishedMath';

	const symbolSrc = (key: string) =>
		assetUrl(
			`/assets/sprites/monkeySymbols/${key === 'ST' && isSocialMode() ? 'ST_social' : key}.png`,
		);

	const showRtp = $derived(shouldDisplayRtp());

	const modeRtpLine = (modeKey: PublishedModeKey, label: string) => {
		const cost = formatPublishedCost(PUBLISHED_MODE_COST[modeKey]);
		const stake = isSocialMode() ? 'base play amount' : 'base bet';
		const price = isSocialMode() ? `${cost}× play amount` : `cost ${cost}×`;
		const maxWin = `Max win ${PUBLISHED_MAX_WIN_LABEL}× ${stake}`;
		if (!showRtp) return `${label} — ${price} · ${maxWin}`;
		return `${label} — ${price} · RTP ${PUBLISHED_RTP_PCT}% · ${maxWin}`;
	};

	const modeRtpLines = $derived(
		showRtp
			? [
					modeRtpLine('base', paytableModeLabel('base')),
					modeRtpLine('base_ante', paytableModeLabel('base_ante')),
					modeRtpLine('feature_spin', paytableModeLabel('feature_spin')),
					modeRtpLine('peak_spin', paytableModeLabel('peak_spin')),
					modeRtpLine('bonus_see', paytableModeLabel('bonus_see')),
					modeRtpLine('bonus_hear', paytableModeLabel('bonus_hear')),
					modeRtpLine('bonus_pick', paytableModeLabel('bonus_pick')),
				]
			: [],
	);

	const SYMBOL_NAMES: Record<string, string> = {
		BA: 'Banana',
		GR: 'Grape',
		OR: 'Orange',
		CO: 'Coconut',
		LE: 'Lemon',
		A: 'Ace',
		K: 'King',
		Q: 'Queen',
		J: 'Jack',
		T: 'Ten',
	};

	/** Column order matches Le Bandit Info (13+ → 5). */
	const PAYTABLE_TIERS: { label: string; size: number | string }[] = [
		{ label: '13+', size: 13 },
		{ label: '11–12', size: 11 },
		{ label: '9–10', size: 9 },
		{ label: '8', size: 8 },
		{ label: '7', size: 7 },
		{ label: '6', size: 6 },
		{ label: '5', size: 5 },
	];

	type PaySym = 'BA' | 'GR' | 'OR' | 'CO' | 'LE' | 'A' | 'K' | 'Q' | 'J' | 'T';

	const SYMBOL_TIERS: Record<PaySym, SmallClusterPayTierValues> = {
		BA: SMALL_CLUSTER_TIERS.top,
		GR: SMALL_CLUSTER_TIERS.high,
		OR: SMALL_CLUSTER_TIERS.high,
		CO: SMALL_CLUSTER_TIERS.mid,
		LE: SMALL_CLUSTER_TIERS.mid,
		A: SMALL_CLUSTER_TIERS.royals,
		K: SMALL_CLUSTER_TIERS.royals,
		Q: SMALL_CLUSTER_TIERS.royals,
		J: SMALL_CLUSTER_TIERS.royals,
		T: SMALL_CLUSTER_TIERS.royals,
	};

	const LOW_SYMBOLS: PaySym[] = ['T', 'J', 'Q', 'K', 'A'];
	const HIGH_SYMBOLS: PaySym[] = ['LE', 'CO', 'OR', 'GR', 'BA'];

	const formatClusterPay = (sym: PaySym, size: number | string) => {
		const tiers = SYMBOL_TIERS[sym];
		if (!tiers) return '—';
		const v = clusterPayAtSize(tiers, size);
		return Number.isInteger(v) ? `${v}×` : `${v}×`;
	};

	const specials = $derived([
		{ keys: ['W'], copy: paytableCopy('wild') },
		{ keys: ['ST'], copy: paytableCopy('scatter') },
		{ keys: ['CB', 'CS', 'CG'], copy: paytableCopy('levelUpTiles') },
		{ keys: ['CG'], copy: paytableCopy('peakSpin') },
		{ keys: ['XM'], copy: paytableCopy('multiPower') },
		{ keys: ['CL'], copy: paytableCopy('collectorPower') },
	]);
</script>

<section class="mm-paytable">
	<h2 class="mm-paytable__title">{paytableCopy('title')}</h2>
	<p class="mm-paytable__intro">
		{paytableCopy('intro')}
	</p>

	<h3 class="mm-paytable__subtitle">Low symbols</h3>
	<table class="mm-paytable__table">
		<thead>
			<tr>
				<th>Symbol</th>
				{#each PAYTABLE_TIERS as tier (tier.label)}
					<th>{tier.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each LOW_SYMBOLS as sym (sym)}
				<tr>
					<td>
						<span class="mm-paytable__symbol">
							<img src={symbolSrc(sym)} alt="" />
							{SYMBOL_NAMES[sym] ?? sym}
						</span>
					</td>
					{#each PAYTABLE_TIERS as tier (tier.label)}
						<td>{formatClusterPay(sym, tier.size)}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	<h3 class="mm-paytable__subtitle">High symbols</h3>
	<table class="mm-paytable__table">
		<thead>
			<tr>
				<th>Symbol</th>
				{#each PAYTABLE_TIERS as tier (tier.label)}
					<th>{tier.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each HIGH_SYMBOLS as sym (sym)}
				<tr>
					<td>
						<span class="mm-paytable__symbol">
							<img src={symbolSrc(sym)} alt="" />
							{SYMBOL_NAMES[sym] ?? sym}
						</span>
					</td>
					{#each PAYTABLE_TIERS as tier (tier.label)}
						<td>{formatClusterPay(sym, tier.size)}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	<h3 class="mm-paytable__subtitle">SPECIAL SYMBOLS</h3>
	<ul class="mm-paytable__specials">
		{#each specials as special (special.copy)}
			<li>
				<span class="mm-paytable__special-art" aria-hidden="true">
					{#each special.keys as key (key)}
						<img src={symbolSrc(key)} alt="" />
					{/each}
				</span>
				<span>{special.copy}</span>
			</li>
		{/each}
	</ul>

	{#if showRtp}
		<h3 class="mm-paytable__subtitle">RTP by mode</h3>
		<ul class="mm-paytable__list">
			{#each modeRtpLines as line (line)}
				<li>{line}</li>
			{/each}
		</ul>
	{/if}
</section>

<style lang="scss">
	.mm-paytable {
		color: #ffffff;
		font-family: Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		text-shadow: none;
	}

	.mm-paytable__title {
		margin: 0 0 0.5rem;
		font-size: 1.15rem;
		font-weight: 800;
		text-align: center;
	}

	.mm-paytable__intro {
		margin: 0 0 0.75rem;
		font-size: 0.95rem;
		line-height: 1.5;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.92);
	}

	.mm-paytable__table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.92rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	th,
	td {
		padding: 0.35rem 0.5rem;
		border-bottom: 1px solid rgba(255, 215, 0, 0.15);
		text-align: center;
	}

	th:first-child,
	td:first-child {
		text-align: left;
	}

	.mm-paytable__subtitle {
		margin: 0.75rem 0 0.35rem;
		font-size: 1rem;
		font-weight: 700;
	}

	.mm-paytable__list {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.mm-paytable__symbol {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-width: 7.5rem;
	}

	.mm-paytable__symbol img {
		width: 44px;
		height: 44px;
		object-fit: contain;
		flex: 0 0 auto;
	}

	.mm-paytable__specials {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.mm-paytable__specials li {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 0.45rem 0;
		border-bottom: 1px solid rgba(255, 215, 0, 0.12);
	}

	.mm-paytable__special-art {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 0 0 auto;
		min-width: 48px;
	}

	.mm-paytable__special-art img {
		width: 40px;
		height: 40px;
		object-fit: contain;
	}
</style>
