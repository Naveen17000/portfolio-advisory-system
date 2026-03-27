"""Generate PDF reports for user's financial analysis."""
import io
import logging
from datetime import datetime

logger = logging.getLogger("portfolio_api")


def generate_report(user, profile, risk, portfolio) -> bytes:
    """Generate a text-based report (HTML that can be converted to PDF by frontend)."""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937; }}
            h1 {{ color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }}
            h2 {{ color: #1f2937; margin-top: 30px; }}
            .header {{ text-align: center; margin-bottom: 40px; }}
            .section {{ margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }}
            .metric {{ display: inline-block; margin: 10px 20px 10px 0; }}
            .metric-value {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
            .metric-label {{ font-size: 12px; color: #6b7280; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th, td {{ padding: 10px 15px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
            th {{ background: #f3f4f6; font-weight: 600; }}
            .footer {{ text-align: center; margin-top: 40px; font-size: 11px; color: #9ca3af; }}
            .risk-badge {{ display: inline-block; padding: 4px 16px; border-radius: 20px; font-weight: 600; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Portfolio Advisory Report</h1>
            <p>Generated on {datetime.now().strftime('%B %d, %Y')}</p>
            <p>Prepared for: <strong>{user.full_name}</strong></p>
        </div>

        <h2>1. Risk Profile Summary</h2>
        <div class="section">
            <div class="metric">
                <div class="metric-value">{risk.overall_score:.1f}</div>
                <div class="metric-label">Risk Score (0-100)</div>
            </div>
            <div class="metric">
                <div class="metric-value">{risk.risk_category.replace('_', ' ').title()}</div>
                <div class="metric-label">Risk Category</div>
            </div>
            <div class="metric">
                <div class="metric-value">{risk.life_stage_modifier}x</div>
                <div class="metric-label">Life Stage Modifier</div>
            </div>
        </div>

        <h3>Sub-Scores</h3>
        <div class="section">
            <div class="metric">
                <div class="metric-value">{risk.spending_ratio_score:.1f}</div>
                <div class="metric-label">Spending Ratio</div>
            </div>
            <div class="metric">
                <div class="metric-value">{risk.savings_consistency_score:.1f}</div>
                <div class="metric-label">Savings Consistency</div>
            </div>
            <div class="metric">
                <div class="metric-value">{risk.investment_discipline_score:.1f}</div>
                <div class="metric-label">Investment Discipline</div>
            </div>
            <div class="metric">
                <div class="metric-value">{risk.liability_burden_score:.1f}</div>
                <div class="metric-label">Liability Burden</div>
            </div>
        </div>

        <h2>2. Financial Profile</h2>
        <div class="section">
            <table>
                <tr><td>Monthly Income</td><td>Rs. {float(profile.monthly_income):,.0f}</td></tr>
                <tr><td>Monthly Expenses</td><td>Rs. {float(profile.monthly_expenses):,.0f}</td></tr>
                <tr><td>Monthly Savings</td><td>Rs. {float(profile.monthly_savings):,.0f}</td></tr>
                <tr><td>Total Liabilities</td><td>Rs. {float(profile.total_liabilities):,.0f}</td></tr>
                <tr><td>Emergency Fund</td><td>{profile.emergency_fund_months} months</td></tr>
                <tr><td>Life Stage</td><td>{profile.life_stage.replace('_', ' ').title()}</td></tr>
                <tr><td>Investment Horizon</td><td>{profile.investment_horizon_years} years</td></tr>
                <tr><td>Investment Experience</td><td>{profile.investment_experience.replace('_', ' ').title()}</td></tr>
            </table>
        </div>

        <h2>3. Portfolio Allocation</h2>
        <div class="section">
            <p><strong>{portfolio.name}</strong></p>
            <p>Expected Return Range: <strong>{portfolio.expected_return_min}% - {portfolio.expected_return_max}%</strong></p>
            <table>
                <tr><th>Asset Class</th><th>Allocation</th><th>Rationale</th></tr>
    """

    for alloc in portfolio.allocations:
        asset_label = alloc.asset_class.replace('_', ' ').title()
        html += f"<tr><td>{asset_label}</td><td>{alloc.allocation_pct}%</td><td>{alloc.rationale or '-'}</td></tr>"

    html += """
            </table>
        </div>

        <div class="footer">
            <p>This report is for educational purposes only and does not constitute financial advice.</p>
            <p>Generated by PortfolioAdvisor - AI-Driven Investment Risk Profiling System</p>
        </div>
    </body>
    </html>
    """
    return html.encode('utf-8')
