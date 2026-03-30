"""Generate comprehensive portfolio advisory report."""
import logging
from datetime import datetime

from app.services.risk_engine import assess_risk
from app.services.portfolio_engine import generate_portfolio
from app.services.anomaly_detector import analyze_financial_health

logger = logging.getLogger("portfolio_api")


def _risk_color(category: str) -> str:
    return {"conservative": "#22c55e", "moderate": "#3b82f6", "aggressive": "#ef4444"}.get(category, "#6b7280")


def _grade_color(grade: str) -> str:
    return {"A": "#22c55e", "B": "#3b82f6", "C": "#eab308", "D": "#f97316", "F": "#ef4444"}.get(grade, "#6b7280")


def _bar(pct: float, color: str = "#3b82f6") -> str:
    w = max(0, min(100, pct))
    return f'<div style="background:#e5e7eb;border-radius:6px;height:10px;width:100%"><div style="background:{color};border-radius:6px;height:10px;width:{w}%"></div></div>'


def _alloc_color(asset: str) -> str:
    colors = {
        "equity_large_cap": "#3b82f6", "equity_mid_cap": "#6366f1", "equity_small_cap": "#8b5cf6",
        "debt": "#10b981", "gold_commodities": "#f59e0b", "liquid_funds": "#06b6d4",
    }
    return colors.get(asset, "#6b7280")


def generate_report_data(user, profile, risk, portfolio) -> dict:
    """Generate structured report data for the frontend to render."""
    # Run health analysis
    profile_data = {
        "monthly_income": float(profile.monthly_income),
        "monthly_expenses": float(profile.monthly_expenses),
        "monthly_savings": float(profile.monthly_savings),
        "total_liabilities": float(profile.total_liabilities),
        "emergency_fund_months": profile.emergency_fund_months,
        "dependents_count": profile.dependents_count,
        "investment_horizon_years": profile.investment_horizon_years,
        "life_stage": profile.life_stage,
        "investment_experience": profile.investment_experience,
        "existing_investments": profile.existing_investments or {},
    }
    health = analyze_financial_health(profile_data)

    income = float(profile.monthly_income)
    expenses = float(profile.monthly_expenses)
    savings = float(profile.monthly_savings)

    allocations = []
    for a in portfolio.allocations:
        allocations.append({
            "asset_class": a.asset_class,
            "allocation_pct": a.allocation_pct,
            "rationale": a.rationale or "",
            "expected_return_min": a.expected_return_min,
            "expected_return_max": a.expected_return_max,
        })

    return {
        "generated_at": datetime.now().isoformat(),
        "user_name": user.full_name,
        "risk_score": float(risk.overall_score),
        "risk_category": risk.risk_category,
        "sub_scores": {
            "spending_ratio": float(risk.spending_ratio_score),
            "savings_consistency": float(risk.savings_consistency_score),
            "investment_discipline": float(risk.investment_discipline_score),
            "liability_burden": float(risk.liability_burden_score),
        },
        "life_stage_modifier": float(risk.life_stage_modifier),
        "profile": {
            "monthly_income": income,
            "monthly_expenses": expenses,
            "monthly_savings": savings,
            "savings_ratio": round(savings / income * 100, 1) if income > 0 else 0,
            "total_liabilities": float(profile.total_liabilities),
            "emergency_fund_months": profile.emergency_fund_months,
            "life_stage": profile.life_stage,
            "investment_horizon_years": profile.investment_horizon_years,
            "investment_experience": profile.investment_experience,
            "dependents_count": profile.dependents_count,
        },
        "portfolio": {
            "name": portfolio.name,
            "expected_return_min": portfolio.expected_return_min,
            "expected_return_max": portfolio.expected_return_max,
            "allocations": allocations,
        },
        "health": {
            "score": health["health_score"],
            "grade": health["health_grade"],
            "tone": health["tone"],
            "nudges": health["nudges"][:5],
            "micro_wins": health["micro_wins"],
            "anomaly_count": health["summary"]["anomaly_count"],
        },
    }


def generate_report(user, profile, risk, portfolio) -> bytes:
    """Generate a beautifully designed HTML report."""
    data = generate_report_data(user, profile, risk, portfolio)
    now = datetime.now()

    income = data["profile"]["monthly_income"]
    expenses = data["profile"]["monthly_expenses"]
    savings = data["profile"]["monthly_savings"]
    savings_ratio = data["profile"]["savings_ratio"]
    liabilities = data["profile"]["total_liabilities"]

    risk_score = data["risk_score"]
    risk_cat = data["risk_category"]
    r_color = _risk_color(risk_cat)

    health_grade = data["health"]["grade"]
    health_score = data["health"]["score"]
    g_color = _grade_color(health_grade)

    # Build allocation rows
    alloc_rows = ""
    for a in data["portfolio"]["allocations"]:
        if a["allocation_pct"] <= 0:
            continue
        label = a["asset_class"].replace("_", " ").title()
        color = _alloc_color(a["asset_class"])
        alloc_rows += f"""
        <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6">
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:12px;height:12px;border-radius:50%;background:{color}"></div>
                    <strong>{label}</strong>
                </div>
            </td>
            <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">{a['allocation_pct']:.1f}%</td>
            <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;width:30%">{_bar(a['allocation_pct'], color)}</td>
            <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;text-align:right;color:#6b7280;font-size:13px">{a['expected_return_min']:.1f}% - {a['expected_return_max']:.1f}%</td>
        </tr>"""

    # Build nudge rows
    nudge_rows = ""
    priority_colors = {"high": "#ef4444", "medium": "#f59e0b", "low": "#3b82f6"}
    for n in data["health"]["nudges"]:
        p_color = priority_colors.get(n.get("priority", "medium"), "#6b7280")
        nudge_rows += f"""
        <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid #f3f4f6">
            <div style="flex-shrink:0;width:8px;height:8px;border-radius:50%;background:{p_color};margin-top:6px"></div>
            <div style="flex:1">
                <div style="font-size:14px;color:#1f2937;line-height:1.5">{n['message']}</div>
                <div style="font-size:11px;color:#9ca3af;margin-top:4px">Priority: {n.get('priority','medium').title()} · Impact Score: {n.get('impact_score', 0)}/100</div>
            </div>
        </div>"""

    # Build micro wins
    wins_html = ""
    for w in data["health"]["micro_wins"]:
        wins_html += f"""
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0">
            <span style="color:#22c55e;font-size:18px">&#10003;</span>
            <span style="font-size:14px;color:#1f2937">{w['message']}</span>
        </div>"""

    # Sub-score bars
    sub = data["sub_scores"]

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portfolio Advisory Report — {data['user_name']}</title>
<style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; background: #ffffff; line-height: 1.6; }}
    .page {{ max-width: 820px; margin: 0 auto; padding: 48px 40px; }}
    @media print {{ .page {{ padding: 24px; }} .no-print {{ display: none; }} }}

    /* Header */
    .header {{ text-align: center; padding-bottom: 32px; border-bottom: 3px solid #2563eb; margin-bottom: 36px; }}
    .header h1 {{ font-size: 28px; color: #2563eb; letter-spacing: -0.5px; }}
    .header .subtitle {{ color: #6b7280; font-size: 14px; margin-top: 8px; }}
    .header .user {{ font-size: 18px; font-weight: 600; color: #1f2937; margin-top: 12px; }}

    /* Section */
    .section {{ margin-bottom: 36px; }}
    .section-title {{ font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; display: flex; align-items: center; gap: 10px; }}
    .section-num {{ display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #2563eb; color: white; font-size: 13px; font-weight: 700; }}

    /* Cards */
    .card-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }}
    .card {{ background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; }}
    .card-value {{ font-size: 32px; font-weight: 800; line-height: 1.2; }}
    .card-label {{ font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }}
    .card-sub {{ font-size: 12px; color: #9ca3af; margin-top: 6px; }}

    /* Table */
    table {{ width: 100%; border-collapse: collapse; }}
    th {{ padding: 10px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; background: #f9fafb; border-bottom: 2px solid #e5e7eb; }}

    /* Profile grid */
    .profile-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
    .profile-item {{ display: flex; justify-content: space-between; padding: 10px 16px; background: #f9fafb; border-radius: 8px; }}
    .profile-item .label {{ color: #6b7280; font-size: 14px; }}
    .profile-item .value {{ font-weight: 600; font-size: 14px; }}

    /* Score bar */
    .score-row {{ display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }}
    .score-label {{ width: 160px; font-size: 13px; color: #4b5563; }}
    .score-bar {{ flex: 1; }}
    .score-val {{ width: 40px; text-align: right; font-size: 13px; font-weight: 600; }}

    /* Footer */
    .footer {{ text-align: center; padding-top: 32px; border-top: 2px solid #e5e7eb; margin-top: 40px; }}
    .footer p {{ font-size: 11px; color: #9ca3af; margin: 4px 0; }}
    .footer .brand {{ font-size: 13px; font-weight: 600; color: #2563eb; margin-bottom: 8px; }}

    .disclaimer {{ background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 12px; color: #92400e; line-height: 1.6; }}
</style>
</head>
<body>
<div class="page">

    <!-- HEADER -->
    <div class="header">
        <h1>Portfolio Advisory Report</h1>
        <div class="subtitle">Generated on {now.strftime('%B %d, %Y at %I:%M %p')}</div>
        <div class="user">{data['user_name']}</div>
    </div>

    <!-- 1. EXECUTIVE SUMMARY -->
    <div class="section">
        <div class="section-title"><span class="section-num">1</span> Executive Summary</div>
        <div class="card-grid">
            <div class="card">
                <div class="card-value" style="color:{r_color}">{risk_score:.0f}</div>
                <div class="card-label">Risk Score</div>
                <div class="card-sub">{risk_cat.replace('_',' ').title()} Investor</div>
            </div>
            <div class="card">
                <div class="card-value" style="color:{g_color}">{health_grade}</div>
                <div class="card-label">Health Grade</div>
                <div class="card-sub">Score: {health_score}/100</div>
            </div>
            <div class="card">
                <div class="card-value" style="color:#10b981">{savings_ratio:.0f}%</div>
                <div class="card-label">Savings Rate</div>
                <div class="card-sub">Rs. {savings:,.0f}/month</div>
            </div>
        </div>
    </div>

    <!-- 2. FINANCIAL PROFILE -->
    <div class="section">
        <div class="section-title"><span class="section-num">2</span> Financial Profile</div>
        <div class="profile-grid">
            <div class="profile-item"><span class="label">Monthly Income</span><span class="value">Rs. {income:,.0f}</span></div>
            <div class="profile-item"><span class="label">Monthly Expenses</span><span class="value">Rs. {expenses:,.0f}</span></div>
            <div class="profile-item"><span class="label">Monthly Savings</span><span class="value">Rs. {savings:,.0f}</span></div>
            <div class="profile-item"><span class="label">Total Liabilities</span><span class="value">Rs. {liabilities:,.0f}</span></div>
            <div class="profile-item"><span class="label">Emergency Fund</span><span class="value">{data['profile']['emergency_fund_months']} months</span></div>
            <div class="profile-item"><span class="label">Life Stage</span><span class="value">{data['profile']['life_stage'].replace('_',' ').title()}</span></div>
            <div class="profile-item"><span class="label">Investment Horizon</span><span class="value">{data['profile']['investment_horizon_years']} years</span></div>
            <div class="profile-item"><span class="label">Experience</span><span class="value">{data['profile']['investment_experience'].replace('_',' ').title()}</span></div>
        </div>
    </div>

    <!-- 3. RISK SCORE BREAKDOWN -->
    <div class="section">
        <div class="section-title"><span class="section-num">3</span> Risk Score Breakdown</div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
            <div class="score-row">
                <span class="score-label">Spending Ratio (25%)</span>
                <div class="score-bar">{_bar(sub['spending_ratio'])}</div>
                <span class="score-val">{sub['spending_ratio']:.0f}</span>
            </div>
            <div class="score-row">
                <span class="score-label">Savings Consistency (25%)</span>
                <div class="score-bar">{_bar(sub['savings_consistency'])}</div>
                <span class="score-val">{sub['savings_consistency']:.0f}</span>
            </div>
            <div class="score-row">
                <span class="score-label">Investment Discipline (30%)</span>
                <div class="score-bar">{_bar(sub['investment_discipline'])}</div>
                <span class="score-val">{sub['investment_discipline']:.0f}</span>
            </div>
            <div class="score-row">
                <span class="score-label">Liability Burden (20%)</span>
                <div class="score-bar">{_bar(sub['liability_burden'])}</div>
                <span class="score-val">{sub['liability_burden']:.0f}</span>
            </div>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:14px;color:#4b5563">Life Stage Modifier</span>
                <span style="font-size:18px;font-weight:700;color:{r_color}">{data['life_stage_modifier']:.2f}x</span>
            </div>
        </div>
    </div>

    <!-- 4. PORTFOLIO ALLOCATION -->
    <div class="section">
        <div class="section-title"><span class="section-num">4</span> Recommended Portfolio Allocation</div>
        <div style="margin-bottom:12px;font-size:14px;color:#6b7280">
            Expected Return: <strong style="color:#1f2937">{data['portfolio']['expected_return_min']:.1f}% — {data['portfolio']['expected_return_max']:.1f}% p.a.</strong>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Asset Class</th>
                    <th style="text-align:right">Weight</th>
                    <th>Allocation</th>
                    <th style="text-align:right">Exp. Return</th>
                </tr>
            </thead>
            <tbody>
                {alloc_rows}
            </tbody>
        </table>
    </div>

    <!-- 5. HEALTH ANALYSIS -->
    <div class="section">
        <div class="section-title"><span class="section-num">5</span> Financial Health Analysis</div>

        {"" if not wins_html else f'''
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:20px">
            <div style="font-size:14px;font-weight:700;color:#166534;margin-bottom:8px">What You're Doing Well</div>
            {wins_html}
        </div>
        '''}

        {"" if not nudge_rows else f'''
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px">
            <div style="font-size:14px;font-weight:700;color:#1f2937;margin-bottom:8px">Recommended Actions</div>
            {nudge_rows}
        </div>
        '''}
    </div>

    <!-- DISCLAIMER -->
    <div class="disclaimer">
        <strong>Disclaimer:</strong> This report is generated algorithmically for educational purposes only and does not constitute certified financial advice.
        Mutual fund investments are subject to market risks. Past performance does not guarantee future results.
        Please consult a SEBI-registered financial advisor before making investment decisions.
    </div>

    <!-- FOOTER -->
    <div class="footer">
        <div class="brand">PortfolioAdvisor</div>
        <p>AI-Driven Investment Risk Profiling & Portfolio Advisory System</p>
        <p>Report ID: {now.strftime('%Y%m%d%H%M%S')} · Generated {now.strftime('%d %b %Y')}</p>
    </div>

</div>
</body>
</html>"""

    return html.encode("utf-8")
